from fastapi import FastAPI, Request, Form, Path
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import sqlalchemy
from sqlalchemy import create_engine, text
import json
import logging
from decimal import Decimal
from datetime import datetime, date
from fastapi import APIRouter

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Custom JSON encoder to handle Decimal and datetime
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super(CustomJSONEncoder, self).default(obj)

app = FastAPI(title="SQL Inspector")

app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Templates
templates = Jinja2Templates(directory="app/templates")

# Initialize test database connection
# Note: In production, use environment variables for credentials
engine = create_engine("postgresql://postgres:postgres@localhost:5432/sql_inspector")

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request}
    )

@app.get("/test-connection")
async def test_connection():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            return {"status": "success", "message": "Database connection successful"}
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        return {"status": "error", "message": f"Database connection failed: {str(e)}"}

@app.post("/execute")
async def execute_query(query: str = Form(...)):
    try:
        with engine.connect() as connection:
            # Remove any trailing semicolons
            clean_query = query.strip().rstrip(';')
            
            # Only get execution plan for SELECT queries
            plan = None
            if clean_query.upper().startswith('SELECT'):
                # Parse the query and get execution plan
                explain_query = f"EXPLAIN (FORMAT JSON, ANALYZE) {clean_query}"
                logger.debug(f"Executing EXPLAIN query: {explain_query}")
                
                result = connection.execute(text(explain_query))
                plan = result.fetchone()[0]
                logger.debug(f"Execution plan received: {json.dumps(plan, indent=2, cls=CustomJSONEncoder)}")
            
            # Execute the actual query (with limit for safety)
            # Only add LIMIT if it's a SELECT query and doesn't already have a LIMIT
            if clean_query.upper().startswith('SELECT'):
                if not clean_query.upper().strip().endswith('LIMIT 5'):
                    safe_query = f"""
                        WITH query_with_limit AS (
                            {clean_query}
                            LIMIT 100
                        )
                        SELECT * FROM query_with_limit
                    """
                else:
                    safe_query = clean_query
            else:
                safe_query = clean_query
            
            logger.debug(f"Executing safe query: {safe_query}")
            result = connection.execute(text(safe_query))
            
            rows = []
            rowcount = None

            if clean_query.upper().startswith('SELECT'):
                columns = result.keys()
                for row in result:
                    row_dict = {}
                    for column, value in zip(columns, row):
                        if isinstance(value, Decimal):
                            row_dict[column] = float(value)
                        elif isinstance(value, (datetime, date)):
                            row_dict[column] = value.isoformat()
                        else:
                            row_dict[column] = value
                    rows.append(row_dict)
            else:
                # For DDL/DML, get affected row count if available
                rowcount = result.rowcount

            response_data = {
                "status": "success",
                "data": rows,
                "plan": plan,
                "rowCount": rowcount,
                "error": None
            }
            
            # Use custom JSON encoder for logging
            logger.debug(f"Sending response: {json.dumps(response_data, indent=2, cls=CustomJSONEncoder)}")
            return response_data
            
    except Exception as e:
        logger.error(f"Query execution failed: {str(e)}")
        return {
            "status": "error",
            "data": None,
            "plan": None,
            "rowCount": None,
            "error": str(e)
        }

@app.get("/tables")
async def get_tables():
    try:
        with engine.connect() as connection:
            result = connection.execute(text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
                """
            ))
            tables = [row[0] for row in result]
            return {"status": "success", "tables": tables}
    except Exception as e:
        return {"status": "error", "tables": [], "error": str(e)}

@app.get("/table-schema/{table_name}")
async def get_table_schema(table_name: str = Path(..., min_length=1)):
    try:
        with engine.connect() as connection:
            result = connection.execute(text(f'''
                SELECT
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    (
                        SELECT 'YES'
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu
                          ON tc.constraint_name = kcu.constraint_name
                         AND tc.table_schema = kcu.table_schema
                        WHERE tc.constraint_type = 'PRIMARY KEY'
                          AND tc.table_name = c.table_name
                          AND kcu.column_name = c.column_name
                        LIMIT 1
                    ) AS is_primary_key
                FROM information_schema.columns c
                WHERE table_schema = 'public' AND table_name = :table_name
                ORDER BY ordinal_position
            '''), {"table_name": table_name})
            columns = [
                {
                    "name": row[0],
                    "type": row[1],
                    "nullable": row[2],
                    "default": row[3],
                    "primary_key": row[4] == 'YES'
                }
                for row in result
            ]
            return {"status": "success", "columns": columns}
    except Exception as e:
        return {"status": "error", "columns": [], "error": str(e)} 