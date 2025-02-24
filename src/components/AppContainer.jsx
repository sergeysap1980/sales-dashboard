import React, { useState, useEffect } from 'react';
import DetailedSalesDashboard from './DetailedSalesDashboard';
import LoginPage from './LoginPage';
import { BarChart3, Menu, LogOut, X, PieChart, TrendingUp, Users } from 'lucide-react';

const AppContainer = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeReport, setActiveReport] = useState('sales');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
  };

  const menuItems = [
    {
      id: 'sales',
      title: 'Анализ продаж',
      icon: <BarChart3 className="w-5 h-5" />,
      description: 'Детальный анализ продаж и прибыли'
    },
    {
      id: 'performance',
      title: 'KPI сотрудников',
      icon: <TrendingUp className="w-5 h-5" />,
      description: 'Показатели эффективности'
    },
    {
      id: 'customers',
      title: 'Клиенты',
      icon: <Users className="w-5 h-5" />,
      description: 'Анализ клиентской базы'
    },
    {
      id: 'categories',
      title: 'Категории',
      icon: <PieChart className="w-5 h-5" />,
      description: 'Анализ по категориям'
    }
  ];

  const handleMenuClick = (id) => {
    setActiveReport(id);
    setSidebarOpen(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    switch (activeReport) {
      case 'sales':
        return <DetailedSalesDashboard />;
      default:
        return <div className="p-6">Отчет находится в разработке</div>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Верхняя панель */}
      <header className="bg-white shadow z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-md hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="ml-4 text-xl font-bold text-blue-800">
                {menuItems.find(item => item.id === activeReport)?.title}
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Боковое меню */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity z-20 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />
      
      <div 
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform z-30 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-blue-800">Dashboard</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg mb-2 transition-colors ${
                activeReport === item.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              {item.icon}
              <div className="text-left">
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-gray-500">{item.description}</div>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Основной контент */}
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default AppContainer;