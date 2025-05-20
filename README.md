# SQL Inspector

A web-based SQL query visualizer and debugger that helps you understand and optimize your PostgreSQL queries. Similar to Python Tutor, but for SQL!

## Features

- Interactive SQL editor with syntax highlighting
- Query execution with results display
- Visual execution plan analysis
- Real-time query debugging
- Support for PostgreSQL queries

## Prerequisites

- Python 3.12 or higher
- PostgreSQL database server
- pip (Python package installer)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sql-inspect.git
cd sql-inspect
```

2. Create a virtual environment and activate it:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows, use `.venv\Scripts\activate`
```

3. Install dependencies:
```bash
pip install -e .
```

4. Configure your PostgreSQL connection:
Edit the database connection string in `app/main.py` to match your PostgreSQL settings:
```python
engine = create_engine("postgresql://username:password@localhost:5432/database_name")
```

## Running the Application

1. Start the FastAPI server:
```bash
uvicorn app.main:app --reload
```

2. Open your browser and navigate to:
```
http://localhost:8000
```

## Usage

1. Enter your SQL query in the editor
2. Click "Execute Query" to run the query
3. View the results in the table format
4. Check the execution plan visualization to understand query performance

## Security Notes

- The application currently limits query results to 100 rows for safety
- Ensure proper database user permissions are set
- Do not use in production without implementing proper security measures
- Consider implementing query whitelisting for additional security

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
