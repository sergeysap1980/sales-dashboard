import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Trophy, Diamond, Crown } from 'lucide-react';
import * as XLSX from 'xlsx';

const DetailedSalesDashboard = () => {
  const [groupData, setGroupData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const calculateRank = (marginGrowth) => {
    if (marginGrowth > 4) return 'diamond';
    if (marginGrowth > 3) return 'gold';
    if (marginGrowth > 2) return 'silver';
    return 'none';
  };

  const processExcelData = useCallback((rawData) => {
    return rawData.map(row => ({
      name: row.Group || row.Группа,
      manager: row.Manager || row.Менеджер,
      revenue: parseFloat(row.Revenue || row.Оборот || 0),
      prevRevenue: parseFloat(row.PrevRevenue || row.ПредыдущийОборот || 0),
      cleanMargin: parseFloat(row.CleanMargin || row.ОчищеннаяМаржа || 0),
      marginGrowth: parseFloat(row.MarginGrowth || row.ПриростМаржи || 0),
      drr: parseFloat(row.DRR || row.ДРР || 0),
      weeklyRevenue: [],
      rank: calculateRank(parseFloat(row.MarginGrowth || row.ПриростМаржи || 0)),
      color: row.Color || '#8884d8'
    }));
  }, []);

  const prepareChartData = useCallback((groups) => {
    const weeks = Array.from({length: 10}, (_, i) => `Week ${i + 1}`);
    return weeks.map(week => {
      const dataPoint = { week };
      groups.forEach(group => {
        dataPoint[group.name] = group.weeklyRevenue[week] || 0;
      });
      return dataPoint;
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        console.log('Начинаем загрузку файла...');
        const response = await fetch('/sales_data.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellStyles: true,
          cellNF: true
        });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const processedData = processExcelData(jsonData);
        setGroupData(processedData);
        
        const newChartData = prepareChartData(processedData);
        setChartData(newChartData);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Детали ошибки:', error);
        let errorMessage = 'Ошибка при загрузке данных';
        
        if (error.message.includes('404')) {
          errorMessage = 'Файл sales_data.xlsx не найден в папке public';
        } else if (error.message.includes('Failed to parse')) {
          errorMessage = 'Ошибка при парсинге Excel файла. Проверьте формат файла';
        }
        
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [processExcelData, prepareChartData]);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 'diamond':
        return <Diamond className="w-6 h-6 text-blue-400" />;
      case 'gold':
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 'silver':
        return <Trophy className="w-6 h-6 text-gray-400" />;
      default:
        return null;
    }
  };

  const getRankStyle = (rank) => {
    switch (rank) {
      case 'diamond':
        return 'bg-blue-50';
      case 'gold':
        return 'bg-yellow-50';
      case 'silver':
        return 'bg-gray-50';
      default:
        return '';
    }
  };

  if (isLoading) {
    return <div className="p-6">Загрузка данных...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Ошибка: {error}</div>;
  }

  return (
    <div className="p-6 bg-gray-50">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-blue-800">Анализ продаж и прибыли</h1>
        <p className="text-gray-600">Неделя 17.02.2025 - 23.02.2025</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {groupData.map((group) => (
          <div key={group.name} className={`rounded-lg shadow-lg p-6 ${getRankStyle(group.rank)} transform hover:scale-105 transition-transform`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold mb-1">{group.name}</h3>
                <p className="text-lg text-gray-700 font-semibold">{group.manager}</p>
              </div>
              {getRankIcon(group.rank)}
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-700 mb-2">
                +{group.marginGrowth.toFixed(1)}%
                <span className="text-sm text-gray-600 ml-2">прирост маржи</span>
              </div>
              <div className="text-gray-600">
                Очищенная маржа: <span className="font-semibold">{group.cleanMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Динамика оборота по группам</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            {groupData.map((group) => (
              <Line
                key={group.name}
                type="monotone"
                dataKey={group.name}
                stroke={group.color}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-8 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">Детальный анализ по группам</h2>
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-3 text-left">Место</th>
              <th className="p-3 text-left">Группа</th>
              <th className="p-3 text-left">Менеджер</th>
              <th className="p-3 text-right">Оборот</th>
              <th className="p-3 text-right">Рост</th>
              <th className="p-3 text-right">ДРР %</th>
              <th className="p-3 text-right font-bold bg-blue-50">Маржа очищенная %</th>
              <th className="p-3 text-right">Прирост маржи</th>
            </tr>
          </thead>
          <tbody>
            {groupData.map((group) => (
              <tr key={group.name} className={getRankStyle(group.rank)}>
                <td className="p-3">{getRankIcon(group.rank)}</td>
                <td className="p-3 font-medium">{group.name}</td>
                <td className="p-3 font-semibold">{group.manager}</td>
                <td className="p-3 text-right">{Math.round(group.revenue).toLocaleString()} ₽</td>
                <td className="p-3 text-right">
                  {((group.revenue - group.prevRevenue) / group.prevRevenue * 100).toFixed(1)}%
                </td>
                <td className="p-3 text-right">{((group.drr / group.revenue) * 100).toFixed(1)}%</td>
                <td className="p-3 text-right font-bold bg-blue-50">{group.cleanMargin.toFixed(1)}%</td>
                <td className="p-3 text-right text-green-600 font-semibold">
                  +{group.marginGrowth.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Система наград</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <Diamond className="w-6 h-6 text-blue-400" />
            <div>
              <p className="font-semibold">Бриллиантовый кубок</p>
              <p className="text-sm text-gray-600">Прирост маржи более 4%</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Crown className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="font-semibold">Золотой кубок</p>
              <p className="text-sm text-gray-600">Прирост маржи 3-4%</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Trophy className="w-6 h-6 text-gray-400" />
            <div>
              <p className="font-semibold">Серебряный кубок</p>
              <p className="text-sm text-gray-600">Прирост маржи 2-3%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedSalesDashboard;