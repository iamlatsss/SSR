import React, { useState, useMemo } from "react";
import DashboardLayout from "../components/DashboardLayout";
import PortSelect from "../components/PortSelect";
import { Copy, Mail, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";

const Quotation = () => {
    const [formData, setFormData] = useState({
        email: "",
        pol: "",
        pod: "",
        containersize: "",
        // Charges
        Ocean_freight: "",
        Ocean_freight_currency: "USD",
        Shipping_line_charges: "",
        Shipping_line_charges_currency: "INR",
        DO_charges: "",
        DO_charges_currency: "INR",
        cfsCharges: "",
        cfsCharges_currency: "INR",

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
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
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
            `Container Size: ${formData.containersize || ""}`,
            "",
            "CHARGES:",
            `Ocean Freight: ${formData.Ocean_freight || "0"} ${formData.Ocean_freight_currency}`,
            `Shipping Line Charges: ${formData.Shipping_line_charges || "0"} ${formData.Shipping_line_charges_currency}`,
            `DO Charges: ${formData.DO_charges || "0"} ${formData.DO_charges_currency}`,
            `CFS Charges: ${formData.cfsCharges || "0"} ${formData.cfsCharges_currency}`,
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
.details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
.details-table td { padding: 8px; border-bottom: 1px solid #eee; }
.charges-table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 1px solid #ddd; }
.charges-table th { background-color: #f8f9fa; text-align: left; padding: 10px; border-bottom: 2px solid #ddd; }
.charges-table td { padding: 10px; border-bottom: 1px solid #ddd; }
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

    <h3>Shipment Details</h3>
    <table class="details-table">
      <tr><td style="width: 150px; font-weight: bold;">POL:</td><td>${formData.pol || ""}</td></tr>
      <tr><td style="font-weight: bold;">POD:</td><td>${formData.pod || ""}</td></tr>
      <tr><td style="font-weight: bold;">Container Size:</td><td>${formData.containersize || ""}</td></tr>
      <tr><td style="font-weight: bold;">Validity:</td><td>${formatDate(formData.validity) || ""}</td></tr>
    </table>

    <h3>Charges</h3>
    <table class="charges-table">
      <thead>
        <tr>
          <th>Charge Description</th>
          <th>Amount</th>
          <th>Currency</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Ocean Freight</td>
          <td>${formData.Ocean_freight || "0"}</td>
          <td>${formData.Ocean_freight_currency}</td>
        </tr>
        <tr>
          <td>Shipping Line Charges</td>
          <td>${formData.Shipping_line_charges || "0"}</td>
          <td>${formData.Shipping_line_charges_currency}</td>
        </tr>
        <tr>
          <td>DO Charges</td>
          <td>${formData.DO_charges || "0"}</td>
          <td>${formData.DO_charges_currency}</td>
        </tr>
        <tr>
          <td>CFS Charges</td>
          <td>${formData.cfsCharges || "0"}</td>
          <td>${formData.cfsCharges_currency}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 20px;">
        <strong>Terms & Conditions:</strong>
        <p style="white-space: pre-wrap; margin-top: 5px;">${formData.terms || "Standard Terms Apply"}</p>
    </div>

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-8rem)]">
                {/* FORM SECTION */}
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Mail size={18} className="text-indigo-600" /> Quotation Details
                        </h3>
                        <button
                            onClick={() => setFormData({
                                email: "", pol: "", pod: "", containersize: "",
                                Ocean_freight: "", Ocean_freight_currency: "USD",
                                Shipping_line_charges: "", Shipping_line_charges_currency: "INR",
                                DO_charges: "", DO_charges_currency: "INR",
                                cfsCharges: "", cfsCharges_currency: "INR",
                                terms: "", validity: ""
                            })}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Reset Form"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); openMailClient(); }}>

                        {/* Row 1: Email & Validity */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wider">Email To</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="client@example.com"
                                    className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                />
                            </div>
                            <div className="w-40">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wider">Validity</label>
                                <input
                                    type="date"
                                    name="validity"
                                    value={formData.validity}
                                    onChange={handleChange}
                                    className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Row 2: POL, POD, Size */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <PortSelect
                                    label="POL"
                                    name="pol"
                                    value={formData.pol}
                                    onChange={handleChange}
                                    placeholder="Loading Port"
                                    className="py-1.5 text-sm"
                                />
                            </div>
                            <div>
                                <PortSelect
                                    label="POD"
                                    name="pod"
                                    value={formData.pod}
                                    onChange={handleChange}
                                    placeholder="Discharge Port"
                                    className="py-1.5 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Container</label>
                                <select
                                    name="containersize"
                                    value={formData.containersize}
                                    onChange={handleChange}
                                    className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all appearance-none"
                                >
                                    <option value="">Size</option>
                                    {[
                                        "20 Dry Standard", "40 Dry Standard", "40 Dry High", "45 Dry High",
                                        "20 Tank", "40 Tank",
                                        "20' Reefer Standard", "40' Reefer High",
                                        "20 Open Top", "40 Open Top", "40 Open Top High",
                                        "40 Flat Standard", "40 Flat High", "20 Flat"
                                    ].map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-2"></div>

                        {/* Charges */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2">Freight & Charges</label>

                            {[
                                { key: 'Ocean_freight', label: 'Ocean Freight' },
                                { key: 'Shipping_line_charges', label: 'Shipping Line' },
                                { key: 'DO_charges', label: 'DO Charges' },
                                { key: 'cfsCharges', label: 'CFS Charges' },
                            ].map((charge) => (
                                <div key={charge.key} className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-9">
                                        <div className="relative">
                                            <label className="absolute -top-1.5 left-2 px-1 bg-white dark:bg-dark-card text-[10px] font-semibold text-slate-500">{charge.label}</label>
                                            <input
                                                type="text"
                                                name={charge.key}
                                                value={formData[charge.key]}
                                                onChange={handleChange}
                                                placeholder="0.00"
                                                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2 col-start-11">
                                        <select
                                            name={`${charge.key}_currency`}
                                            value={formData[`${charge.key}_currency`]}
                                            onChange={handleChange}
                                            className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                        >
                                            <option value="USD">USD</option>
                                            <option value="INR">INR</option>
                                            <option value="EUR">EUR</option>
                                            <option value="GBP">GBP</option>
                                            <option value="AED">AED</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-2"></div>

                        {/* Terms */}
                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2">Terms & Conditions</label>
                            <textarea
                                name="terms"
                                value={formData.terms}
                                onChange={handleChange}
                                rows={2}
                                className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Mail size={16} /> Open Mail Client
                            </button>
                            <button
                                type="button"
                                onClick={copyHtmlToClipboard}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
                            >
                                <Copy size={16} /> Copy HTML
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