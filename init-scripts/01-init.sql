-- USERS TABLE
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CATEGORIES TABLE
CREATE TABLE categories (
    category_id INT PRIMARY KEY,
    category_name VARCHAR(100),
    parent_category_id INT,
    FOREIGN KEY (parent_category_id) REFERENCES categories(category_id)
);

-- PRODUCTS TABLE
CREATE TABLE products (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(100),
    description TEXT,
    price DECIMAL(10, 2),
    stock_quantity INT,
    category_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- ORDERS TABLE
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    user_id INT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50),
    total_amount DECIMAL(10, 2),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ORDER ITEMS TABLE
CREATE TABLE order_items (
    order_item_id INT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT,
    unit_price DECIMAL(10, 2),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- PAYMENTS TABLE
CREATE TABLE payments (
    payment_id INT PRIMARY KEY,
    order_id INT,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10, 2),
    payment_method VARCHAR(50),
    payment_status VARCHAR(50),
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

INSERT INTO users (user_id, full_name, email, password_hash) VALUES
(1, 'Alice Smith', 'alice@example.com', 'hashed_pwd1'),
(2, 'Bob Johnson', 'bob@example.com', 'hashed_pwd2'),
(3, 'Charlie Brown', 'charlie@example.com', 'hashed_pwd3'),
(4, 'Diana Prince', 'diana@example.com', 'hashed_pwd4'),
(5, 'Ethan Hunt', 'ethan@example.com', 'hashed_pwd5'),
(6, 'Fiona Glenanne', 'fiona@example.com', 'hashed_pwd6'),
(7, 'George Clooney', 'george@example.com', 'hashed_pwd7'),
(8, 'Hannah Montana', 'hannah@example.com', 'hashed_pwd8'),
(9, 'Ian Malcolm', 'ian@example.com', 'hashed_pwd9'),
(10, 'Jane Doe', 'jane@example.com', 'hashed_pwd10'),
(11, 'Kevin Hart', 'kevin@example.com', 'hashed_pwd11'),
(12, 'Laura Palmer', 'laura@example.com', 'hashed_pwd12'),
(13, 'Michael Scott', 'michael@example.com', 'hashed_pwd13'),
(14, 'Nina Dobrev', 'nina@example.com', 'hashed_pwd14'),
(15, 'Oscar Wilde', 'oscar@example.com', 'hashed_pwd15'),
(16, 'Pam Beesly', 'pam@example.com', 'hashed_pwd16'),
(17, 'Quentin Tarantino', 'quentin@example.com', 'hashed_pwd17'),
(18, 'Rachel Green', 'rachel@example.com', 'hashed_pwd18'),
(19, 'Steve Rogers', 'steve@example.com', 'hashed_pwd19'),
(20, 'Tony Stark', 'tony@example.com', 'hashed_pwd20');

INSERT INTO categories (category_id, category_name, parent_category_id) VALUES
(1, 'Electronics', NULL),
(2, 'Mobile Phones', 1),
(3, 'Laptops', 1),
(4, 'Clothing', NULL),
(5, 'Men', 4),
(6, 'Women', 4),
(7, 'Accessories', NULL),
(8, 'Home Appliances', NULL),
(9, 'Books', NULL),
(10, 'Fitness', NULL),
(11, 'Gaming', NULL),
(12, 'Audio', 1),
(13, 'Tablets', 1),
(14, 'Smart Watches', 1),
(15, 'Shoes', 4),
(16, 'Furniture', NULL),
(17, 'Kitchen', 8),
(18, 'Toys', NULL),
(19, 'Stationery', NULL),
(20, 'Cameras', 1);

INSERT INTO products (product_id, product_name, description, price, stock_quantity, category_id) VALUES
(1, 'iPhone 14', 'Latest Apple iPhone', 999.99, 50, 2),
(2, 'Galaxy S22', 'Samsung smartphone', 899.99, 30, 2),
(3, 'MacBook Pro', '16-inch laptop', 2399.00, 20, 3),
(4, 'Dell XPS 13', 'Compact Windows laptop', 1299.00, 15, 3),
(5, 'T-shirt', 'Cotton t-shirt', 19.99, 200, 5),
(6, 'Jeans', 'Blue denim jeans', 49.99, 120, 5),
(7, 'Dress', 'Evening dress', 89.99, 100, 6),
(8, 'Blouse', 'Silk blouse', 39.99, 80, 6),
(9, 'Bluetooth Speaker', 'Portable speaker', 59.99, 60, 12),
(10, 'Smartwatch', 'Health tracking watch', 199.99, 40, 14),
(11, 'iPad', 'Apple tablet', 499.99, 25, 13),
(12, 'Echo Dot', 'Amazon smart speaker', 29.99, 70, 12),
(13, 'Yoga Mat', 'Non-slip mat', 24.99, 150, 10),
(14, 'Protein Powder', 'Vanilla whey protein', 34.99, 100, 10),
(15, 'Harry Potter Book Set', 'Books 1–7', 79.99, 90, 9),
(16, 'Toy Car', 'Battery-powered toy', 19.99, 200, 18),
(17, 'Notebook Pack', 'Set of 5 notebooks', 9.99, 300, 19),
(18, 'Dining Set', 'Plates and bowls', 99.99, 50, 17),
(19, 'Sofa', '3-seater sofa', 599.99, 10, 16),
(20, 'Camera', 'DSLR digital camera', 699.99, 15, 20);

INSERT INTO orders (order_id, user_id, status, total_amount) VALUES
(101, 1, 'Processing', 999.99),
(102, 2, 'Shipped', 89.99),
(103, 3, 'Delivered', 1299.00),
(104, 4, 'Cancelled', 29.99),
(105, 5, 'Processing', 34.99),
(106, 6, 'Delivered', 2399.00),
(107, 7, 'Processing', 19.99),
(108, 8, 'Processing', 49.99),
(109, 9, 'Delivered', 79.99),
(110, 10, 'Shipped', 899.99),
(111, 11, 'Delivered', 24.99),
(112, 12, 'Processing', 499.99),
(113, 13, 'Shipped', 199.99),
(114, 14, 'Processing', 59.99),
(115, 15, 'Delivered', 39.99),
(116, 16, 'Cancelled', 1299.00),
(117, 17, 'Delivered', 34.99),
(118, 18, 'Shipped', 99.99),
(119, 19, 'Processing', 79.99),
(120, 20, 'Processing', 599.99);

INSERT INTO order_items (order_item_id, order_id, product_id, quantity, unit_price) VALUES
(1001, 101, 1, 1, 999.99),
(1002, 102, 7, 1, 89.99),
(1003, 103, 4, 1, 1299.00),
(1004, 104, 12, 1, 29.99),
(1005, 105, 14, 1, 34.99),
(1006, 106, 3, 1, 2399.00),
(1007, 107, 5, 1, 19.99),
(1008, 108, 6, 1, 49.99),
(1009, 109, 15, 1, 79.99),
(1010, 110, 2, 1, 899.99),
(1011, 111, 13, 1, 24.99),
(1012, 112, 11, 1, 499.99),
(1013, 113, 10, 1, 199.99),
(1014, 114, 9, 1, 59.99),
(1015, 115, 8, 1, 39.99),
(1016, 116, 4, 1, 1299.00),
(1017, 117, 14, 1, 34.99),
(1018, 118, 18, 1, 99.99),
(1019, 119, 15, 1, 79.99),
(1020, 120, 19, 1, 599.99);

INSERT INTO payments (payment_id, order_id, amount, payment_method, payment_status) VALUES
(501, 101, 999.99, 'Credit Card', 'Paid'),
(502, 102, 89.99, 'PayPal', 'Paid'),
(503, 103, 1299.00, 'Credit Card', 'Paid'),
(504, 104, 29.99, 'UPI', 'Refunded'),
(505, 105, 34.99, 'PayPal', 'Paid'),
(506, 106, 2399.00, 'Credit Card', 'Paid'),
(507, 107, 19.99, 'UPI', 'Paid'),
(508, 108, 49.99, 'Credit Card', 'Paid'),
(509, 109, 79.99, 'PayPal', 'Paid'),
(510, 110, 899.99, 'Credit Card', 'Paid'),
(511, 111, 24.99, 'UPI', 'Paid'),
(512, 112, 499.99, 'Credit Card', 'Paid'),
(513, 113, 199.99, 'PayPal', 'Paid'),
(514, 114, 59.99, 'UPI', 'Paid'),
(515, 115, 39.99, 'Credit Card', 'Paid'),
(516, 116, 1299.00, 'PayPal', 'Refunded'),
(517, 117, 34.99, 'Credit Card', 'Paid'),
(518, 118, 99.99, 'Credit Card', 'Paid'),
(519, 119, 79.99, 'PayPal', 'Paid'),
(520, 120, 599.99, 'Credit Card', 'Paid');
