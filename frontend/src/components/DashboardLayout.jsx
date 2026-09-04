import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    LayoutDashboard,
    Users,
    Bell,
    LogOut,
    Menu,
    X,
    Moon,
    Sun,
    Shield,
    FileText,
    Briefcase,
    Anchor,
    ShieldCheck,
    UserCircle,
    ChevronDown,
    Bug,
    Upload,
    Image as ImageIcon,
    Ship,
    Globe,
    CreditCard,
    DollarSign,
    FileCheck2,
    Compass,
    Scroll
} from 'lucide-react';

const SidebarItem = ({ icon, text, to, isCollapsed, queryParam }) => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const isPathActive = location.pathname === to;
    
    // Check if query params match if specified
    const isQueryActive = queryParam
        ? Object.entries(queryParam).every(([key, val]) => queryParams.get(key) === val)
        : true;
        
    const isActive = isPathActive && isQueryActive;

    const content = (
        <div className="flex items-center w-full">
            <span className={`transition-colors shrink-0 flex items-center justify-center ${isCollapsed ? 'mx-auto' : 'mr-3'} ${
                isActive 
                    ? 'text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
            }`}>
                {icon}
            </span>
            {!isCollapsed && <span className="truncate">{text}</span>}
        </div>
    );

    const className = `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative ${
        isActive
            ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-600 dark:border-indigo-400 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/80 dark:hover:bg-dark-card hover:text-slate-900 dark:hover:text-slate-200 border-l-4 border-transparent'
    } ${isCollapsed ? 'justify-center w-12 h-12 px-0 py-0 mx-auto' : 'w-full'}`;

    const linkUrl = to + (queryParam ? '?' + new URLSearchParams(queryParam).toString() : '');

    return (
        <div className="relative group">
            <Link to={linkUrl} className={className}>
                {content}
            </Link>
            
            {/* Tooltip in collapsed mode */}
            {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 pointer-events-none transition-all duration-150 ease-out">
                    <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-slate-800 rotate-45 -mr-0.5 z-10 relative left-[1px]"></div>
                    <div className="bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap tracking-wide border border-slate-800 dark:border-slate-700">
                        {text}
                    </div>
                </div>
            )}
        </div>
    );
};

const SidebarGroup = ({ icon, text, children, isCollapsed, isExpanded, onToggle, isActive }) => {
    return (
        <div className="relative group/parent">
            {/* Parent Header Button */}
            <button
                onClick={onToggle}
                className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative ${
                    isActive
                        ? 'text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-600 dark:border-indigo-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/80 dark:hover:bg-dark-card hover:text-slate-900 dark:hover:text-slate-200 border-l-4 border-transparent'
                } ${isCollapsed ? 'justify-center w-12 h-12 px-0 py-0 mx-auto' : ''}`}
            >
                <div className="flex items-center min-w-0">
                    <span className={`transition-colors shrink-0 flex items-center justify-center ${isCollapsed ? 'mx-auto' : 'mr-3'} ${
                        isActive
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-400 dark:text-slate-500 group-hover/parent:text-slate-600 dark:group-hover/parent:text-slate-300'
                    }`}>
                        {icon}
                    </span>
                    {!isCollapsed && <span className="truncate">{text}</span>}
                </div>
                {!isCollapsed && (
                    <ChevronDown
                        size={16}
                        className={`text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                            isExpanded ? 'rotate-180 text-indigo-500' : ''
                        }`}
                    />
                )}
            </button>

            {/* Submenu Content */}
            {!isCollapsed ? (
                /* Expanded Sidebar: Sliding Accordion */
                <div
                    className="overflow-hidden transition-all duration-300 ease-in-out pl-4"
                    style={{
                        maxHeight: isExpanded ? `${React.Children.count(children) * 50}px` : '0px',
                        opacity: isExpanded ? 1 : 0,
                    }}
                >
                    <div className="py-1 space-y-1 pl-4 border-l border-slate-100 dark:border-slate-800">
                        {children}
                    </div>
                </div>
            ) : (
                /* Collapsed Sidebar: Hover Popover */
                <div className="absolute left-full top-0 ml-2 hidden group-hover/parent:block w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl dark:shadow-slate-950/50 py-2 z-50 animate-in fade-in slide-in-from-left-2 duration-150 before:absolute before:-left-2 before:top-0 before:w-2 before:h-full before:content-['']">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {text}
                    </div>
                    <div className="mt-1.5 space-y-0.5 px-2">
                        {React.Children.map(children, child =>
                            React.isValidElement(child) ? React.cloneElement(child, { isCollapsed: false }) : child
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ROLE_PERMISSIONS = {
  director: {
    canAccessUsers: true,
    canAccessIGM: false,
    canAccessKYC: false,
  },
  admin: {
    canAccessUsers: true,
    canAccessIGM: true,
    canAccessKYC: true,
  },
  custom: {
    canAccessUsers: false,
    canAccessIGM: false,
    canAccessKYC: false,
  },
  accounts: {
    canAccessUsers: false,
    canAccessIGM: false,
    canAccessKYC: false,
  },
  sales: {
    canAccessUsers: false,
    canAccessIGM: false,
    canAccessKYC: false,
  },
  viewer: {
    canAccessUsers: false,
    canAccessIGM: false,
    canAccessKYC: false,
  }
};

const menuConfig = [
    {
        type: 'group',
        text: 'Dashboard',
        icon: <LayoutDashboard size={20} />,
        to: '/',
        groupKey: 'dashboard',
        children: [
            { text: 'Booking Updates', to: '/booking-updates', icon: <Scroll size={18} /> },
            { text: 'KYC', to: '/kyc', permission: 'canAccessKYC', icon: <ShieldCheck size={18} /> },
            { text: 'Users', to: '/users', permission: 'canAccessUsers', icon: <Users size={18} /> },
            { text: 'Charge', to: '/charges', icon: <DollarSign size={18} /> },
            { text: 'Party', to: '/parties', icon: <Briefcase size={18} /> },
            { text: 'CFS', to: '/cfs', icon: <Compass size={18} /> }
        ]
    },
    {
        type: 'item',
        text: 'Quotation',
        to: '/quotation',
        icon: <FileText size={20} />
    },
    {
        type: 'item',
        text: 'Sea Master BL',
        to: '/si-masterbl',
        queryParam: { direction: 'import' },
        icon: <Ship size={20} />
    },
    {
        type: 'item',
        text: 'DO & FC',
        to: '/do-fc',
        icon: <FileText size={20} />
    },
    {
        type: 'item',
        text: 'IGM',
        to: '/igm',
        permission: 'canAccessIGM',
        icon: <Compass size={20} />
    },
    {
        type: 'group',
        text: 'Invoice',
        icon: <FileCheck2 size={20} />,
        groupKey: 'invoice',
        children: [
            { text: 'Tax Invoice', to: '/invoice', icon: <FileText size={18} /> },
            { text: 'Proforma Invoice', to: '/proforma-invoice', icon: <FileText size={18} /> },
            { text: 'E-Invoice Approval', to: '/e-invoice-approval', icon: <ShieldCheck size={18} /> },
            { text: 'E-Invoice Posting', to: '/e-invoice-posting', icon: <Upload size={18} /> }
        ]
    },
    {
        type: 'group',
        text: 'HBL Documents',
        icon: <Scroll size={20} />,
        groupKey: 'hblDocuments',
        children: [
            { text: 'HBL Generator', to: '/hbl-generator', icon: <FileText size={18} /> },
            { text: 'HBL Register', to: '/hbl-register', icon: <FileCheck2 size={18} /> }
        ]
    }
];

const DashboardLayout = ({ children, title = "Dashboard" }) => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const direction = queryParams.get('direction');

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [editRequests, setEditRequests] = useState([]);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    const profileRef = useRef(null);
    const notificationsRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (user && (user.role === 'Admin' || user.role === 'Director')) {
            const fetchPendingRequests = async () => {
                try {
                    const res = await api.get('/masterbl/edit-requests/pending');
                    if (res.data.success) {
                        setEditRequests(res.data.requests || []);
                    }
                } catch (e) {
                    console.error("Error fetching pending requests:", e);
                }
            };
            fetchPendingRequests();
            const interval = setInterval(fetchPendingRequests, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const handleUpdateRequestStatus = async (id, status) => {
        try {
            const res = await api.put(`/masterbl/edit-requests/${id}/status`, { status });
            if (res.data.success) {
                setEditRequests(prev => prev.filter(r => r.id !== id));
            }
        } catch (e) {
            console.error("Error updating request status:", e);
        }
    };

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('sidebarCollapsed') === 'true';
        }
        return false;
    });

    const isDashboardActive = ['/kyc', '/users', '/charges', '/parties'].includes(location.pathname);
    const isSeaImportActive = ['/si-masterbl', '/si-masterbl-form'].includes(location.pathname) && direction === 'import';
    const isInvoiceActive = ['/invoice', '/proforma-invoice', '/e-invoice-approval', '/e-invoice-posting'].includes(location.pathname);
    const isHblDocsActive = ['/hbl-generator', '/hbl-register'].includes(location.pathname);

    const [expandedMenus, setExpandedMenus] = useState({
        dashboard: isDashboardActive,
        seaImport: isSeaImportActive,
        invoice: isInvoiceActive,
        hblDocuments: isHblDocsActive
    });

    // Sync menu expansion when changing routes
    useEffect(() => {
        setExpandedMenus(prev => ({
            ...prev,
            dashboard: isDashboardActive ? true : prev.dashboard,
            seaImport: isSeaImportActive ? true : prev.seaImport,
            invoice: isInvoiceActive ? true : prev.invoice,
            hblDocuments: isHblDocsActive ? true : prev.hblDocuments
        }));
    }, [location.pathname, direction]);

    const handleToggleGroup = (groupKey) => {
        setExpandedMenus(prev => ({
            ...prev,
            [groupKey]: !prev[groupKey]
        }));
    };

    // Feedback State
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackForm, setFeedbackForm] = useState({ title: "", description: "" });
    const [feedbackImages, setFeedbackImages] = useState([]);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);

    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const userInitials = user?.user_name
        ? user.user_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : 'U';

    const userRole = user?.role?.toLowerCase() || 'viewer';
    const userPermissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS['viewer'];

    const hasPermission = (item) => {
        if (item.permission) {
            return !!userPermissions[item.permission];
        }
        return true;
    };

    // Filter menu items by user roles
    const filteredMenu = menuConfig.map(menu => {
        if (!hasPermission(menu)) return null;
        
        if (menu.type === 'group') {
            const visibleChildren = menu.children.filter(child => hasPermission(child));
            if (visibleChildren.length === 0) {
                if (menu.to) {
                    return {
                        type: 'item',
                        text: menu.text,
                        to: menu.to,
                        icon: menu.icon
                    };
                }
                return null;
            }
            return {
                ...menu,
                children: visibleChildren
            };
        }
        return menu;
    }).filter(Boolean);

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-dark-bg font-poppins text-slate-900 dark:text-white transition-colors duration-300">
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
            <aside className={`
                fixed inset-y-0 left-0 z-30 bg-white dark:bg-dark-bg border-r border-slate-200 dark:border-slate-800 transform 
                transition-all duration-300 ease-in-out shadow-xl md:shadow-sm flex flex-col h-full
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                ${isSidebarCollapsed ? 'md:translate-x-0 md:relative md:z-40 md:w-20' : 'md:translate-x-0 md:relative md:z-40 md:w-64'}
            `}>
                {!isSidebarCollapsed ? (
                    <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex items-center gap-3 font-bold text-xl text-indigo-600 dark:text-indigo-400">
                            <img src="/images/SSR_Logo.png" alt="MANO" className="w-8 h-8 shrink-0" />
                            <span className="truncate">SSR Logistics</span>
                        </div>
                        <button
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => {
                                if (window.innerWidth < 768) {
                                    setIsMobileMenuOpen(false);
                                } else {
                                    setIsSidebarCollapsed(true);
                                    sessionStorage.setItem('sidebarCollapsed', 'true');
                                }
                            }}
                            title="Collapse Sidebar"
                        >
                            <X size={20} />
                        </button>
                    </div>
                ) : (
                    <div className="h-16 flex items-center justify-center border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <button
                            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-200"
                            onClick={() => {
                                setIsSidebarCollapsed(false);
                                sessionStorage.setItem('sidebarCollapsed', 'false');
                            }}
                            title="Expand Sidebar"
                        >
                            <Menu size={20} />
                        </button>
                    </div>
                )}
                <nav className={`flex-1 py-6 px-3 space-y-1 ${isSidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto'} scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800`}>
                    {filteredMenu.map((menu, idx) => {
                        if (menu.type === 'item') {
                            return (
                                <SidebarItem
                                    key={idx}
                                    icon={menu.icon}
                                    text={menu.text}
                                    to={menu.to}
                                    isCollapsed={isSidebarCollapsed}
                                />
                            );
                        } else if (menu.type === 'group') {
                            const isGroupActive = 
                                (menu.groupKey === 'dashboard' && isDashboardActive) ||
                                (menu.groupKey === 'seaImport' && isSeaImportActive) ||
                                (menu.groupKey === 'invoice' && isInvoiceActive) ||
                                (menu.groupKey === 'hblDocuments' && isHblDocsActive);

                            return (
                                <SidebarGroup
                                    key={idx}
                                    icon={menu.icon}
                                    text={menu.text}
                                    isCollapsed={isSidebarCollapsed}
                                    isExpanded={expandedMenus[menu.groupKey]}
                                    isActive={isGroupActive}
                                    onToggle={() => handleToggleGroup(menu.groupKey)}
                                >
                                    {menu.children.map((child, cIdx) => (
                                        <SidebarItem
                                            key={cIdx}
                                            icon={child.icon}
                                            text={child.text}
                                            to={child.to}
                                            queryParam={child.queryParam}
                                            isCollapsed={false}
                                        />
                                    ))}
                                </SidebarGroup>
                            );
                        }
                        return null;
                    })}
                </nav>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <button
                        onClick={() => setShowFeedback(true)}
                        className={`flex items-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-full py-2 text-sm font-medium ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-4'}`}>
                        <Bug size={18} className="shrink-0" />
                        {!isSidebarCollapsed && <span>Bugs & Feedback</span>}
                    </button>
                </div>
            </aside>
            <div className="flex-1 flex flex-col overflow-hidden relative w-full min-w-0">
                <header className="h-16 bg-white dark:bg-dark-bg border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-10 z-40 shadow-sm shrink-0 transition-colors duration-300">
                    <div className="flex items-center gap-4">
                        <button
                            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300 cursor-pointer flex md:hidden items-center justify-center"
                            onClick={() => {
                                setIsMobileMenuOpen(!isMobileMenuOpen);
                            }}
                            title="Toggle Menu"
                        >
                            <Menu size={20} />
                        </button>
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white hidden sm:block">{title}</h1>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                        >
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                        <div className="relative" ref={notificationsRef}>
                            <button
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                            >
                                <Bell className="w-5 h-5 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" />
                                {editRequests.length > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                                        {editRequests.length}
                                    </span>
                                )}
                            </button>

                            {isNotificationsOpen && (
                                <div className="absolute top-12 right-0 w-80 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/55 dark:bg-slate-800/10">
                                        <p className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider">Notifications</p>
                                        {editRequests.length > 0 && (
                                            <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                                                {editRequests.length} Pending
                                            </span>
                                        )}
                                    </div>
                                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                        {editRequests.length === 0 ? (
                                            <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                                                No new notifications
                                            </div>
                                        ) : (
                                            editRequests.map((req) => (
                                                <div key={req.id} className="p-3 text-xs space-y-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            Job #{req.job_no} Edit Request
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                                        Requested by: <strong className="text-slate-700 dark:text-slate-300">{req.requested_by}</strong>
                                                    </p>
                                                    <p className="text-slate-550 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded text-[11px] border border-slate-100 dark:border-slate-800 leading-normal italic">
                                                        "{req.reason}"
                                                    </p>
                                                    <div className="flex gap-2 justify-end pt-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUpdateRequestStatus(req.id, 'Rejected');
                                                            }}
                                                            className="px-2.5 py-1 text-[11px] font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUpdateRequestStatus(req.id, 'Approved');
                                                            }}
                                                            className="px-2.5 py-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
                                                        >
                                                            Approve
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div
                            ref={profileRef}
                            className="relative flex items-center gap-3 pl-4 sm:pl-6 border-l border-slate-200 dark:border-slate-700 cursor-pointer"
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user?.user_name || 'Guest'}</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border-2 border-white dark:border-slate-700 shadow-sm">
                                {userInitials}
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />

                            {/* Dropdown Menu */}
                            {isProfileOpen && (
                                <div className="absolute top-12 right-0 w-48 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 md:hidden">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{user?.user_name || 'Guest'}</p>
                                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                    </div>
                                    <Link
                                        to="/profile"
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <UserCircle size={16} />
                                        My Profile
                                    </Link>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent re-triggering parent click
                                            logout();
                                        }}
                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 bg-slate-50/50 dark:bg-dark-bg transition-colors duration-300 min-w-0">
                    {children}
                </main>
            </div>
            {/* Feedback Modal */}
            {showFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowFeedback(false)}>
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Bug className="text-indigo-600 dark:text-indigo-400" size={24} />
                                Report a Bug / Feedback
                            </h3>
                            <button onClick={() => setShowFeedback(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title / Subject</label>
                                <input
                                    type="text"
                                    value={feedbackForm.title}
                                    onChange={e => setFeedbackForm({ ...feedbackForm, title: e.target.value })}
                                    placeholder="Brief summary of the issue..."
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <textarea
                                    value={feedbackForm.description}
                                    onChange={e => setFeedbackForm({ ...feedbackForm, description: e.target.value })}
                                    placeholder="Please describe the bug or feedback in detail..."
                                    rows={4}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                />
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Screenshots</label>
                                <div className="flex flex-wrap gap-4">
                                    {feedbackImages.map((img, idx) => (
                                        <div key={idx} className="relative w-20 h-20 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden group">
                                            <img src={URL.createObjectURL(img)} alt="preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => setFeedbackImages(prev => prev.filter((_, i) => i !== idx))}
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-indigo-500">
                                        <Upload size={20} />
                                        <span className="text-[10px] mt-1">Upload</span>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files?.length) {
                                                    setFeedbackImages(prev => [...prev, ...Array.from(e.target.files)]);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setSubmittingFeedback(true);
                                    // Simulate API call
                                    setTimeout(() => {
                                        setSubmittingFeedback(false);
                                        setShowFeedback(false);
                                        setFeedbackForm({ title: '', description: '' });
                                        setFeedbackImages([]);
                                        alert("Feedback Submitted Successfully!");
                                    }, 1500);
                                }}
                                disabled={submittingFeedback || !feedbackForm.title}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardLayout;
