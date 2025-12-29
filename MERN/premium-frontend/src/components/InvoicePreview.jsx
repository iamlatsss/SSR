import React from 'react';
import { X } from 'lucide-react';

const InvoicePreview = ({ data, onClose }) => {
    const { invoiceNo, invoiceDate, job, customer, items, totals } = data;

    // Helper to convert number to words (Simplified version)
    const numberToWords = (num) => {
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        const inWords = (n) => {
            if ((n = n.toString()).length > 9) return 'overflow';
            let n_array = ('000000000' + n).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
            if (!n_array) return;
            let str = '';
            str += (n_array[1] != 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Crore ' : '';
            str += (n_array[2] != 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Lakh ' : '';
            str += (n_array[3] != 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Thousand ' : '';
            str += (n_array[4] != 0) ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) + 'Hundred ' : '';
            str += (n_array[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]]) : '';
            return str;
        };

        const numStr = num.toString().split(".");
        let words = inWords(Number(numStr[0])) + 'Rupees Only';
        return words;
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white text-black shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 print:hidden"
                >
                    <X size={20} />
                </button>

                {/* Print Button */}
                <button
                    onClick={() => window.print()}
                    className="absolute top-4 right-16 z-10 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 print:hidden font-medium"
                >
                    Print / Save PDF
                </button>

                {/* Document Container */}
                <div className="flex-1 overflow-auto p-8 text-sm print:p-0 print:overflow-visible" id="printable-invoice" style={{ fontFamily: 'Calibri, Arial, sans-serif' }}>

                    {/* Header */}
                    <div className="border-2 border-slate-900 mb-0">
                        <div className="flex border-b-2 border-slate-900">
                            <div className="w-1/4 p-4 flex items-center justify-center border-r-2 border-slate-900">
                                <img src="/images/SSR_Logo.png" alt="SSR Logo" className="w-24" />
                            </div>
                            <div className="w-3/4 p-2 text-center">
                                <h1 className="text-xl font-bold uppercase text-blue-900">SSR Logistic Solutions Private Limited</h1>
                                <p className="text-xs font-medium">Office No. 612, 6th Floor, Vashi Infotech Park, Sector - 30 A, Near Raghuleela</p>
                                <p className="text-xs font-medium">Mall, Vashi, Navi Mumbai-400703, Maharashtra, India</p>
                                <p className="text-xs font-bold">Tel.No : 7700990630, GST No. : 27ABMCS1941A1ZI</p>
                                <p className="text-xs font-bold text-blue-800">Website: www.ssrlogistic.net</p>
                            </div>
                        </div>

                        <div className="text-center font-bold border-b-2 border-slate-900 py-1 bg-slate-100">
                            TAX INVOICE (Original for Recipient)
                        </div>

                        {/* Customer & Invoice Details */}
                        <div className="flex border-b-2 border-slate-900">
                            <div className="w-1/2 p-2 border-r-2 border-slate-900 space-y-1 text-xs">
                                <p><strong>To, {customer?.name || "Customer Name"}</strong></p>
                                <p className="whitespace-pre-wrap">{customer?.address || "Address not available"}</p>
                                <p><strong>GST NO :</strong> {customer?.gstin || "N/A"} , <strong>State Code:</strong> {customer?.gstin?.substring(0, 2) || "NA"}</p>
                                <p><strong>Place of supply :</strong> {customer?.state || "State"}</p>
                            </div>
                            <div className="w-1/2 p-2 space-y-1 text-xs">
                                <div className="grid grid-cols-2">
                                    <span><strong>Invoice No. :</strong> {invoiceNo}</span>
                                    <span><strong>Invoice Date :</strong> {invoiceDate}</span>
                                </div>
                                <div className="grid grid-cols-2">
                                    <span><strong>JOB No. :</strong> {job?.job_no}</span>
                                    <span><strong>Job Date :</strong> {new Date(job?.created_at).toLocaleDateString('en-GB')}</span>
                                </div>
                                <div><strong>Narration :</strong> {job?.narration || "NA"}</div>
                            </div>
                        </div>

                        {/* Shipment Details */}
                        <div className="flex border-b-2 border-slate-900 text-xs">
                            <div className="w-1/2 p-2 border-r-2 border-slate-900 space-y-1">
                                <p><strong>MBL No. :</strong> {job?.mbl_no || "NA"}</p>
                                <p><strong>MBL Date :</strong> {job?.mbl_date || "NA"}</p>
                                <p><strong>Load Port :</strong> {job?.pol || "NA"}</p>
                                <p><strong>Vessel :</strong> {job?.vessel || "NA"}</p>
                                <p><strong>ETD Date :</strong> {job?.etd || "NA"}</p>
                                <p><strong>Shipper :</strong> {job?.shipper_name || "NA"}</p>
                                <p><strong>Shipment Type :</strong> {job?.booking_type || "NA"}</p>
                                <p><strong>Shipping Bill No :</strong> {job?.shipping_bill_no || ""}</p>
                            </div>
                            <div className="w-1/2 p-2 space-y-1">
                                <p><strong>HBL No. :</strong> {job?.hbl_no || "NA"}</p>
                                <p><strong>HBL Date :</strong> {job?.hbl_date || "NA"}</p>
                                <p><strong>Gross Weight :</strong> {job?.gross_weight || "0.000"}</p>
                                <p><strong>ETA Date :</strong> {job?.eta || "NA"}</p>
                                <p><strong>Voyage :</strong> {job?.voyage || "NA"}</p>
                                <p><strong>Discharge Port :</strong> {job?.pod || "NA"}</p>
                                <p><strong>Consignee :</strong> {job?.consignee_name || "NA"}</p>
                                <p><strong>No: of Cntrs / Type :</strong> {job?.no_of_containers || "1"} X {job?.container_type || "20GP"}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="w-full">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-200 border-b-2 border-slate-900 text-center uppercase">
                                        <th className="border-r border-slate-900 p-1 w-1/3">Particulars</th>
                                        <th className="border-r border-slate-900 p-1">SAC</th>
                                        <th className="border-r border-slate-900 p-1">Rate</th>
                                        <th className="border-r border-slate-900 p-1">Qty</th>
                                        <th className="border-r border-slate-900 p-1">Currency</th>
                                        <th className="border-r border-slate-900 p-1">Amnt_FC</th>
                                        <th className="border-r border-slate-900 p-1">Ex_Rate</th>
                                        <th className="border-r border-slate-900 p-1">Taxable</th>
                                        <th className="p-1">Non_Taxable</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, i) => (
                                        <tr key={i} className="border-b border-slate-300">
                                            <td className="border-r border-slate-900 p-1 px-2 font-bold uppercase">{item.chargeName}</td>
                                            <td className="border-r border-slate-900 p-1 text-center">9967</td>
                                            <td className="border-r border-slate-900 p-1 text-right">{Number(item.rate).toFixed(2)}</td>
                                            <td className="border-r border-slate-900 p-1 text-center">{item.qty}</td>
                                            <td className="border-r border-slate-900 p-1 text-center">{item.currency}</td>
                                            <td className="border-r border-slate-900 p-1 text-right">{item.amountFC ? Number(item.amountFC).toFixed(2) : ""}</td>
                                            <td className="border-r border-slate-900 p-1 text-right">{Number(item.exRate).toFixed(2)}</td>
                                            <td className="border-r border-slate-900 p-1 text-right font-bold">{item.isGST ? Number(item.amountINR).toFixed(2) : "0.00"}</td>
                                            <td className="p-1 text-right font-bold">{!item.isGST ? Number(item.amountINR).toFixed(2) : "0.00"}</td>
                                        </tr>
                                    ))}
                                    {/* Empty rows filler if needed */}
                                    {items.length < 5 && Array(5 - items.length).fill(0).map((_, i) => (
                                        <tr key={`empty-${i}`} className="h-6"><td className="border-r border-slate-900"></td><td className="border-r border-slate-900"></td><td className="border-r border-slate-900"></td><td className="border-r border-slate-900"></td><td className="border-r border-slate-900"></td><td className="border-r border-slate-900"></td><td className="border-r border-slate-900"></td><td className="border-r border-slate-900"></td><td></td></tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-900 font-bold bg-slate-100">
                                        <td colSpan="7" className="text-right p-1 border-r border-slate-900">IGST 18%</td>
                                        <td className="text-right p-1 border-r border-slate-900">{totals.igst.toFixed(2)}</td>
                                        <td className="text-right p-1"></td>
                                    </tr>
                                    <tr className="border-t border-slate-900 font-bold">
                                        <td colSpan="7" className="text-right p-1 border-r border-slate-900"></td>
                                        <td className="text-right p-1 border-r border-slate-900">{totals.igst.toFixed(2)}</td>
                                        <td className="text-right p-1">{totals.igst.toFixed(2)}</td>
                                    </tr>
                                    <tr className="border-t border-slate-900 font-bold">
                                        <td colSpan="7" className="text-right p-1 border-r border-slate-900">Round Off</td>
                                        <td className="text-right p-1 border-r border-slate-900">0.00</td>
                                        <td className="text-right p-1">0.00</td>
                                    </tr>
                                    <tr className="border-t-2 border-slate-900 font-bold bg-slate-200">
                                        <td colSpan="6" className="text-left p-1 border-r border-slate-900">INR - {numberToWords(Math.round(totals.grandTotal))}</td>
                                        <td className="text-right p-1 border-r border-slate-900">INR TOTAL</td>
                                        <td colSpan="2" className="text-right p-1">{Math.round(totals.grandTotal).toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Footer Section */}
                        <div className="flex border-t-2 border-slate-900 text-xs">
                            <div className="w-2/3 p-2 border-r-2 border-slate-900">
                                <p className="mb-1"><strong>Pan No :</strong> ABMCS1941A <strong>GST No:</strong> 27ABMCS1941A1ZI <strong>MSME No:</strong> UDYAM-MH-18-0018552</p>
                                <p className="mb-1"><strong>CIN No:</strong> U52220MH2023PTC414525 <strong>State Code:</strong> 27- Maharashtra</p>
                                <p className="font-bold text-red-600 mt-2">TDS deductions if any, to be calculated excluding GST Amount as per Circular no. 23/2017 dated 19/07/2017 of CBDT</p>

                                <div className="mt-4 border-t border-slate-900 pt-1">
                                    <p><strong>Bank Details : Beneficiary Name : SSR LOGISTIC SOLUTIONS PVT LTD</strong></p>
                                    <p><strong>Bank Name : KOTAK MAHINDRA BANK LTD | IFSC: KKBK0001370</strong></p>
                                    <p><strong>Account Number : 1050002555</strong></p>
                                </div>
                            </div>
                            <div className="w-1/3 p-2 flex flex-col justify-between text-center">
                                <p className="font-bold mb-8">FOR SSR LOGISTIC SOLUTIONS PRIVATE LIMITED</p>
                                {/* Signature Placeholder */}
                                <div className="h-16 flex items-center justify-center">
                                    <img src="/images/signature.png" alt="Signature" className="max-h-full opacity-50" onError={(e) => e.target.style.display = 'none'} />
                                </div>
                                <p className="font-bold">Accounts Department</p>
                            </div>
                        </div>

                        {/* Footer Notes */}
                        <div className="border-t-2 border-slate-900 p-2 text-[10px] leading-tight">
                            <p className="italic mb-1">Note: Kindly release the payment within the agreed credit days under section 15 of the MSME Act, if there is a delay in payment Buyer will be liable to pay compound interest (three times the bank rate notified by the Reserve Bank) as per the MSME act.</p>
                            <p className="font-bold">IMPORTANT PLEASE:</p>
                            <ol className="list-decimal pl-4 space-y-0.5">
                                <li>The arrival notice is issued without prejudice as cargo has not been checked at the time of issuing this notice.</li>
                                <li>a) For Personal Effectes please produce your passport and Authority letter at the time of Collection of D .O. <br /> b) Please produce Letter of Authority for the documents & delivery order.</li>
                                <li>Release order from the bank must be on the Bank's letter head</li>
                                <li>Please intimate us if there is any discrepancy in the invoice within 3 days on receipt of bill; thereafter it will assumed that invoice is accepted.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <style type="text/css">
                {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-invoice, #printable-invoice * {
                        visibility: visible;
                    }
                    #printable-invoice {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        overflow: visible;
                        padding: 0;
                        margin: 0;
                    }
                }
                `}
            </style>
        </div>
    );
};

export default InvoicePreview;
