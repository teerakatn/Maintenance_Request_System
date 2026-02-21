// Global test environment setup
// ค่านี้จะถูก inject ก่อนรัน test ทุกไฟล์
process.env.JWT_SECRET = "test-jwt-secret-key-12345";
process.env.DATABASE_URL = "mysql://test:test@localhost:3306/test_db";
process.env.PORT = "4000";
process.env.SMTP_HOST = "smtp.ethereal.email";
process.env.SMTP_PORT = "587";
process.env.SMTP_SECURE = "false";
process.env.SMTP_USER = "test@example.com";
process.env.SMTP_PASS = "testpassword";
process.env.SMTP_FROM = '"Test" <test@example.com>';
