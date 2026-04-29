const axios = require("axios");

async function test() {
    try {
        const res = await axios.post("http://127.0.0.1:5001/quotation/generate-and-save", {
            client_name: "Test User",
            phone_number: "1234567890",
            email: "test@example.com",
            pol: "Mumbai",
            pod: "Dubai",
            containersize: "20 Dry Standard"
        });
        console.log("Success:", res.data);
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}

test();
