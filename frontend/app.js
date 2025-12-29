// import axios from "axios";

// const handleSubmit = async (e) => {
//   e.preventDefault();

//   const formData = {
//     email, pol, pod, containerSize, rate,
//     Ocean_freight, Shipping_line_charges, DO_charges,
//     shipperDetails, consigneeDetails, terms, validity
//   };

//   try {
//     const res = await axios.post("http://localhost:5000/send-quotation", formData);
//     alert(res.data.message);
//   } catch (err) {
//     alert("Failed to send email.");
//   }
// };
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../frontend/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});
