import React, { useState, useMemo } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Copy, Mail, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";

const Quotation = () => {
    const [formData, setFormData] = useState({
        email: "",
        pol: "",
        pod: "",
        containerSize: "",
        rate: "",
        Ocean_freight: "",
        Shipping_line_charges: "",
        DO_charges: "",
        shipperDetails: "",
        consigneeDetails: "",
        terms: "",
        validity: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const formatDate = (isoDate) => {
        if (!isoDate) return "";
        try {
            const d = new Date(isoDate);
            return d.toLocaleDateString();
        } catch {
            return isoDate;
        }
    };

    // Build plain-text email body for mailto:
    const buildMailtoBody = () => {
        const lines = [
            "Dear Sir,",
            "",
            "Thank you for your inquiry. We are pleased to provide our best offer for your kind reference:",
            "",
            `POL: ${formData.pol || ""}`,
            `POD: ${formData.pod || ""}`,
            `Container Size: ${formData.containerSize || ""}`,
            `Rate: ${formData.rate || ""}`,
            `Ocean Freight: ${formData.Ocean_freight || ""}`,
            `Shipping Line Charges: ${formData.Shipping_line_charges || ""}`,
            `DO Charges: ${formData.DO_charges || ""}`,
            "",
            "Shipper Details:",
            formData.shipperDetails || "",
            "",
            "Consignee Details:",
            formData.consigneeDetails || "",
            "",
            "Terms & Conditions:",
            formData.terms || "",
            "",
            `Validity: ${formatDate(formData.validity) || ""}`,
            "",
            "We trust that the above offer is competitive and meets your requirements.",
            "We look forward to your kind confirmation for further bookings.",
            "",
            "Sincerely,",
            "SSR Logistic Solutions",
        ];

        return lines.join("\n");
    };

    // Open default mail client
    const openMailClient = () => {
        const to = formData.email || "";
        const subject = "Quotation from SSR Logistic Solutions";
        const body = buildMailtoBody();

        const mailto =
            "mailto:" +
            encodeURIComponent(to) +
            "?subject=" +
            encodeURIComponent(subject) +
            "&body=" +
            encodeURIComponent(body);

        window.location.href = mailto;
    };

    // LIVE EMAIL HTML TEMPLATE
    const emailHtml = useMemo(() => {
        const raw = `
<!DOCTYPE html>
<html>
<head>
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4; margin: 0; padding: 0; }
.container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 30px; border: 1px solid #dddddd; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
.header { text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; margin-bottom: 20px; }
.header h1 { color: #4f46e5; margin: 0; font-size: 24px; }
.content { margin-bottom: 20px; }
.quotation-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
.quotation-table th, .quotation-table td { padding: 10px; text-align: left; border-bottom: 1px solid #dddddd; }
.quotation-table tr:nth-child(even) { background-color: #f9f9f9; }
.signature { margin-top: 20px; font-style: italic; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Quotation</h1>
  </div>
  <div class="content">
    <p>Dear Sir,</p>
    <p>Thank you for your inquiry. We are pleased to provide our best offer for your kind reference:</p>

    <h3>Quotation Details</h3>
    <table class="quotation-table">
      <tr><td><strong>POL:</strong></td><td>${formData.pol || ""}</td></tr>
      <tr><td><strong>POD:</strong></td><td>${formData.pod || ""}</td></tr>
      <tr><td><strong>Container Size:</strong></td><td>${formData.containerSize || ""}</td></tr>
      <tr><td><strong>Rate:</strong></td><td>${formData.rate || ""}</td></tr>
      <tr><td><strong>Ocean Freight:</strong></td><td>${formData.Ocean_freight || ""}</td></tr>
      <tr><td><strong>Shipping Line Charges:</strong></td><td>${formData.Shipping_line_charges || ""}</td></tr>
      <tr><td><strong>DO Charges:</strong></td><td>${formData.DO_charges || ""}</td></tr>
      <tr><td><strong>Shipper Details:</strong></td><td>${(formData.shipperDetails || "").replace(/\n/g, "<br/>")}</td></tr>
      <tr><td><strong>Consignee Details:</strong></td><td>${(formData.consigneeDetails || "").replace(/\n/g, "<br/>")}</td></tr>
      <tr><td><strong>Terms:</strong></td><td>${(formData.terms || "").replace(/\n/g, "<br/>")}</td></tr>
      <tr><td><strong>Validity:</strong></td><td>${formatDate(formData.validity) || ""}</td></tr>
    </table>

    <p style="margin-top: 25px;">
      We trust that the above offer is competitive and meets your requirements. We look forward to your kind confirmation for further bookings.
    </p>
  </div>
  <div class="signature">
    <p>Sincerely,</p>
    <p>SSR Logistic Solutions</p>
  </div>
</div>
</body>
</html>
`;
        return raw;
    }, [formData]);

    // Copy HTML to clipboard
    const copyHtmlToClipboard = async () => {
        try {
            if (navigator.clipboard && window.ClipboardItem) {
                const blob = new Blob([emailHtml], { type: "text/html" });
                const data = [new window.ClipboardItem({ "text/html": blob })];
                await navigator.clipboard.write(data);
                toast.success("Formatted email copied to clipboard!");
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(emailHtml);
                toast.success("HTML source copied. Paste into Outlook.");
            } else {
                toast.error("Clipboard API not supported.");
            }
        } catch (err) {
            console.error("Copy failed:", err);
            toast.error("Failed to copy to clipboard.");
        }
    };

    return (
        <DashboardLayout title="Quotation">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
                {/* FORM SECTION */}
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                            Details
                        </h3>
                        <button 
                            onClick={() => setFormData({
                                email: "", pol: "", pod: "", containerSize: "", rate: "", 
                                Ocean_freight: "", Shipping_line_charges: "", DO_charges: "", 
                                shipperDetails: "", consigneeDetails: "", terms: "", validity: ""
                            })}
                            className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="Reset Form"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>

                    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); openMailClient(); }}>
                         {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email To</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                            />
                        </div>

                         {/* POL / POD */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">POL</label>
                                <input
                                    type="text"
                                    name="pol"
                                    value={formData.pol}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">POD</label>
                                <input
                                    type="text"
                                    name="pod"
                                    value={formData.pod}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Container Size */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Container Size</label>
                            <select
                                name="containerSize"
                                value={formData.containerSize}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all appearance-none"
                            >
                                <option value="">Select size</option>
                                <option value="20'GP">20'GP</option>
                                <option value="20'HQ">20'HQ</option>
                                <option value="40'DRY">40'DRY</option>
                                <option value="40'HQ">40'HQ</option>
                                <option value="20'Reefer">20'Reefer</option>
                                <option value="40'Reefer">40'Reefer</option>
                                <option value="20'Flat rack">20'Flat rack</option>
                                <option value="40'Flat rack">40'Flat rack</option>
                                <option value="20'Open top">20'Open top</option>
                                <option value="40'Open top">40'Open top</option>
                            </select>
                        </div>

                         {/* Charges Grid */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['rate', 'Ocean_freight', 'Shipping_line_charges', 'DO_charges'].map(field => (
                                <div key={field}>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 capitalize">
                                        {field.replace(/_/g, ' ')}
                                    </label>
                                    <input
                                        type="text"
                                        name={field}
                                        value={formData[field]}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Details Textareas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shipper Details</label>
                                <textarea
                                    name="shipperDetails"
                                    value={formData.shipperDetails}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Consignee Details</label>
                                <textarea
                                    name="consigneeDetails"
                                    value={formData.consigneeDetails}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Terms */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Terms & Conditions</label>
                            <textarea
                                name="terms"
                                value={formData.terms}
                                onChange={handleChange}
                                rows={2}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
                            />
                        </div>

                        {/* Validity */}
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Validity</label>
                            <input
                                type="date"
                                name="validity"
                                value={formData.validity}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                <Mail size={18} /> Open Mail Client
                            </button>
                            <button
                                type="button"
                                onClick={copyHtmlToClipboard}
                                className="flex-1 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                <Copy size={18} /> Copy HTML
                            </button>
                        </div>
                    </form>
                </div>

                {/* VISUALIZATION SECTION */}
                <div className="bg-slate-100 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 flex flex-col h-full overflow-hidden">
                     <div className="bg-white rounded-xl shadow-sm h-full overflow-hidden">
                        <iframe
                            title="Email Preview"
                            style={{ width: "100%", height: "100%", border: "0" }}
                            srcDoc={emailHtml}
                        />
                     </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Quotation;
