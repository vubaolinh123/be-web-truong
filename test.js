import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("=== TOOL TÍNH XOR GAME (HỖ TRỢ SỐ ÂM) ===");

function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
    while (true) {
        console.log("\n-------------------------------------------");
        try {
            // 1. Nhập Memory Value (Số tìm được trong GG)
            // Hỗ trợ nhập số âm, ví dụ: -1215378843
            const memStr = await ask("1. Nhập Value hiện tại trong GG: ");
            if (memStr.toLowerCase() === 'exit') process.exit(0);
            const memVal = parseInt(memStr.trim(), 10);

            // 2. Nhập Game Value (Số nhìn thấy trong Game)
            const gameStr = await ask("2. Nhập số hiển thị trong Game: ");
            const gameVal = parseInt(gameStr.trim(), 10);

            if (isNaN(memVal) || isNaN(gameVal)) {
                console.log("Lỗi: Vui lòng nhập số hợp lệ!");
                continue;
            }

            // Tính Key hiện tại (Javascript xử lý bitwise chuẩn 32-bit như GameGuardian)
            const key = memVal ^ gameVal;
            console.log(`=> KEY HIỆN TẠI: ${key}`);

            // 3. Nhập số muốn hack
            const targetStr = await ask("3. Bạn muốn sửa thành bao nhiêu? (VD: 2000): ");
            const targetVal = parseInt(targetStr.trim(), 10);

            // Tính kết quả
            const result = key ^ targetVal;

            console.log(`\n✅ KẾT QUẢ CẦN ĐIỀN:`);
            console.log(`>>>  ${result}  <<<`);
            console.log("(Hãy điền chính xác con số trên, kể cả nếu là số âm)");
            
        } catch (e) {
            console.log("Lỗi nhập liệu.");
        }
    }
}

main();