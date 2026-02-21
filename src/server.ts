import "dotenv/config";
import fs from "fs";
import app from "./app";

const PORT = process.env.PORT ?? 3000;

// สร้างโฟลเดอร์ uploads/ หากยังไม่มี
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
