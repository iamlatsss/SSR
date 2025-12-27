import React from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';

const Home = () => {
    const { user } = useAuth();

    return (
        <DashboardLayout title="Dashboard">
            <div className="flex flex-col h-full bg-slate-50 dark:bg-dark-bg transition-colors duration-300">
                <div className="flex flex-col justify-center items-center flex-1 p-4">
                    <div className="bg-white dark:bg-dark-card p-10 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center max-w-2xl w-full">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 mb-4">
                            Hello, {user?.user_name || 'User'}!
                        </h1>
                        <div className="text-4xl font-extrabold text-slate-800 dark:text-white mb-6">
                            Welcome to SSR
                        </div>
                        <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800">
                            <span className="text-sm text-slate-500 dark:text-slate-400 mr-2">Your role:</span>
                            <span className="font-semibold text-indigo-700 dark:text-indigo-400 capitalize">
                                {user?.role || 'Guest'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Home;
