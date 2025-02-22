import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Trophy, Diamond, Crown } from 'lucide-react';
import * as XLSX from 'xlsx';

const DetailedSalesDashboard = () => {
  const [groupData, setGroupData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [groupColors, setGroupColors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());

  // Функция для получения текущей недели
  function getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek) + 1;
  }

  // Функция для форматирования дат недели
  function getWeekDates(weekNumber) {
    const year = new Date().getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const daysToFirstMonday = (8 - firstDayOfYear.getDay()) % 7;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
    
    const startDate = new Date(firstMonday);
    startDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    return {
      start: startDate.toLocaleDateString('ru-RU'),
      end: endDate.toLocaleDateString('ru-RU')
    };
  }

  // Генерация списка недель для селекта
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1).map(weekNum => ({
    value: weekNum,
    label: `Неделя ${weekNum} (${getWeekDates(weekNum).start} - ${getWeekDates(weekNum).end})`
  }));

  const calculateRank = (marginGrowth) => {
    if (marginGrowth > 4) return 'diamond';
    if (marginGrowth > 3) return 'gold';
    if (marginGrowth > 2) return 'silver';
    return 'none';
  };

  // Обработка данных из Excel – здесь не передаём цвет из файла,
  // так как он будет вычислен отдельно на фронтенде
  const processExcelData = useCallback((rawData) => {
    return rawData.map(row => {
      const marginGrowth = parseFloat(row.MarginGrowth || row.ПриростМаржи || 0);
      const groupName = row.Group || row.Группа;
      return {
        name: groupName,
        manager: row.Manager || row.Менеджер,
        revenue: parseFloat(row.Revenue || row.Оборот || 0),
        prevRevenue: parseFloat(row.PrevRevenue || row.ПредыдущийОборот || 0),
        cleanMargin: parseFloat(row.CleanMargin || row.ОчищеннаяМаржа || 0),
        marginGrowth: marginGrowth,
        drr: parseFloat(row.DRR || row.ДРР || 0),
        turnover: parseFloat(row.Turnover || row.Оборачиваемость || 0),
        turnoverChange: parseFloat(row.TurnoverChange || row.ИзменениеОборачиваемости || 0),
        cr: parseFloat(row.CR || 0),
        ctr: parseFloat(row.CTR || 0),
        week: Number(row.Week) || null,
        rank: row.Rank || row.Ранг || calculateRank(marginGrowth)
      };
    });
  }, []);

  // Функция подготовки данных для графика: агрегируем оборот (revenue) по неделям для каждой группы
  const prepareChartData = useCallback((data) => {
    const chartDataMap = {};
    data.forEach(item => {
      if (!item.week) return;
      const wk = item.week;
      if (!chartDataMap[wk]) {
        chartDataMap[wk] = { week: `Week ${wk}` };
      }
      if (!chartDataMap[wk][item.name]) {
        chartDataMap[wk][item.name] = item.revenue;
      } else {
        chartDataMap[wk][item.name] += item.revenue;
      }
    });
    return Object.keys(chartDataMap)
      .sort((a, b) => a - b)
      .map(key => chartDataMap[key]);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
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
        
        // Для детального анализа фильтруем данные по выбранной неделе
        const filteredData = jsonData.filter(row => Number(row.Week) === selectedWeek);
        const processedDetailData = processExcelData(filteredData);
        setGroupData(processedDetailData);
        
        // Для графика используем все данные без фильтрации по неделям
        const processedAllData = processExcelData(jsonData);
        const newChartData = prepareChartData(processedAllData);
        setChartData(newChartData);
        
        // Вычисляем уникальные группы и назначаем каждой уникальный цвет на основе её индекса
        const distinctGroups = Array.from(new Set(processedAllData.map(item => item.name)));
        const mapping = {};
        distinctGroups.forEach((name, index) => {
          const hue = Math.round((360 * index) / distinctGroups.length);
          mapping[name] = `hsl(${hue}, 70%, 50%)`;
        });
        setGroupColors(mapping);
        
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
  }, [processExcelData, prepareChartData, selectedWeek]);

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
        <div className="flex items-center justify-between">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="p-2 border rounded-lg shadow-sm bg-white text-gray-700 w-96"
          >
            {weeks.map((week) => (
              <option key={week.value} value={week.value}>
                {week.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Карточки с детальной информацией (фильтрация по выбранной неделе) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {groupData.map((group) => (
          <div 
            key={group.name} 
            className={`rounded-lg shadow-lg p-6 ${getRankStyle(group.rank)} transform hover:scale-105 transition-transform cursor-pointer`}
            onClick={() => setSelectedEmployee(group)}
          >
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

      {/* График динамики оборота (revenue) по группам – без фильтра по неделям */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Динамика оборота по группам</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            {Object.keys(groupColors).map((groupName) => (
              <Line
                key={groupName}
                type="monotone"
                dataKey={groupName}
                stroke={groupColors[groupName]}
                strokeWidth={3}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Детальная таблица с показателями */}
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
              <th className="p-3 text-right">Оборачиваемость</th>
              <th className="p-3 text-right">Изменение оборачиваемости</th>
              <th className="p-3 text-right">CR</th>
              <th className="p-3 text-right">CTR</th>
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
                <td className="p-3 text-right">{group.turnover.toFixed(1)}</td>
                <td className="p-3 text-right">{group.turnoverChange.toFixed(1)}%</td>
                <td className="p-3 text-right">{group.cr.toFixed(1)}%</td>
                <td className="p-3 text-right">{group.ctr.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Секция с системой наград */}
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

      {/* Модальное окно с подробной информацией */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedEmployee.manager}</h2>
                <p className="text-lg text-gray-600">{selectedEmployee.name}</p>
              </div>
              <button 
                onClick={() => setSelectedEmployee(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Текущий оборот</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(selectedEmployee.revenue).toLocaleString()} ₽
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Очищенная маржа</h3>
                <p className="text-2xl font-bold text-green-600">
                  {selectedEmployee.cleanMargin.toFixed(1)}%
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">ДРР</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {((selectedEmployee.drr / selectedEmployee.revenue) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4">Динамика показателей</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold mb-2">Рост оборота</h4>
                  <p className="text-2xl">
                    {((selectedEmployee.revenue - selectedEmployee.prevRevenue) / selectedEmployee.prevRevenue * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold mb-2">Прирост маржи</h4>
                  <p className="text-2xl text-green-600">
                    +{selectedEmployee.marginGrowth.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">Дополнительная информация</h3>
              <table className="w-full">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Группа</td>
                    <td className="py-2 font-semibold">{selectedEmployee.name}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Статус</td>
                    <td className="py-2 font-semibold flex items-center">
                      {getRankIcon(selectedEmployee.rank)}
                      <span className="ml-2">
                        {selectedEmployee.rank === 'diamond'
                          ? 'Бриллиантовый'
                          : selectedEmployee.rank === 'gold'
                          ? 'Золотой'
                          : selectedEmployee.rank === 'silver'
                          ? 'Серебряный'
                          : 'Стандартный'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-4">Дополнительные показатели</h3>
              <table className="w-full">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Оборачиваемость</td>
                    <td className="py-2 font-semibold">{selectedEmployee.turnover.toFixed(1)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Изменение оборачиваемости</td>
                    <td className="py-2 font-semibold">{selectedEmployee.turnoverChange.toFixed(1)}%</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">CR</td>
                    <td className="py-2 font-semibold">{selectedEmployee.cr.toFixed(1)}%</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">CTR</td>
                    <td className="py-2 font-semibold">{selectedEmployee.ctr.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedSalesDashboard;