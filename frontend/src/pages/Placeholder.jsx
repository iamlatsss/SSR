import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

const Placeholder = () => {
    const location = useLocation();
    
    // Determine title and description based on pathname
    const getPageDetails = () => {
        const path = location.pathname.toLowerCase();
        switch (path) {
            case '/charges':
                return {
                    title: 'Charge Management',
                    description: 'Configure, edit, and manage standard logistics billing charges, tariffs, and shipping line service fees.'
                };
            case '/parties':
                return {
                    title: 'Party Directory',
                    description: 'Manage customers, shippers, consignees, shipping lines, customs brokers, and third-party logistics agents.'
                };
            case '/e-invoice-approval':
                return {
                    title: 'E-Invoice Approval',
                    description: 'Verify, approve, and authenticate digital tax invoices and proforma invoices before submission to tax portals.'
                };
            case '/e-invoice-posting':
                return {
                    title: 'E-Invoice Posting',
                    description: 'Post approved e-invoices directly to government portals (NIC / GSTN) and fetch IRN details.'
                };
            default:
                return {
                    title: 'Module Under Development',
                    description: 'This screen is currently being built and will be available in the next release.'
                };
        }
    };

    const details = getPageDetails();

    return (
        <DashboardLayout title={details.title}>
            <div className="flex flex-col h-full items-center justify-center p-6 bg-slate-50/50 dark:bg-dark-bg transition-colors duration-300">
                <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-3xl p-10 max-w-lg w-full text-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-6 shadow-inner animate-pulse">
                        <Construction size={40} className="stroke-[1.5]" />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-slate-850 dark:text-white mb-3">
                        {details.title}
                    </h2>
                    
                    <p className="text-slate-550 dark:text-slate-400 text-sm leading-relaxed mb-8">
                        {details.description}
                    </p>

                    <div className="relative border-t border-slate-100 dark:border-slate-800/80 pt-6">
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white dark:bg-dark-card px-4 py-0.5 text-[10px] font-bold tracking-wider text-indigo-500/80 dark:text-indigo-400/80 uppercase">
                            ERP Module
                        </span>
                        
                        <div className="flex flex-col gap-3">
                            <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/30 py-2.5 px-4 rounded-xl border border-slate-100 dark:border-slate-800 font-mono">
                                Path: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{location.pathname}</span>
                            </div>
                            
                            <Link 
                                to="/" 
                                className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer"
                            >
                                <ArrowLeft size={16} />
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Placeholder;
