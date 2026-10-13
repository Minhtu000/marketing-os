import fs from 'node:fs';
import path from 'node:path';
async function getSeoData() {
  const filePath = path.join(process.cwd(), 'data', 'seo-os', 'seo-os-export.json');
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    return null;
  }
}
export default async function SeoDashboardPage() {
  const exportData = await getSeoData();
  if (!exportData) {
    return <div className="p-8 text-red-500">Không tìm thấy dữ liệu SEO Snapshot. Vui lòng chạy lại script generate.</div>;
  }
  const { status, data } = exportData;
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing OS - {data.module.name}</h1>
          <p className="text-gray-500 mt-1">Domain: {data.scope.domain}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500 text-right">
            <p>Dữ liệu tính đến:</p>
            <p className="font-semibold">{new Date(data.dataAsOf).toLocaleDateString('vi-VN')}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${
            status === 'live' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            • {status}
          </span>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">Chỉ số Hiệu suất (KPIs)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.sections.kpis.map((kpi: any) => (
            <div key={kpi.id} className="p-5 border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">{kpi.name}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{kpi.value}</span>
                {kpi.unit && <span className="text-sm text-gray-500">{kpi.unit}</span>}
              </div>
              {kpi.source?.ref && (
                <div className="mt-4 pt-3 border-t text-xs text-blue-600 truncate" title={kpi.source.ref}>
                  <span className="mr-1">📄</span> {kpi.source.ref.split('#')[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Tín hiệu (Signals)</h2>
          <div className="space-y-3">
            {data.sections.signals && data.sections.signals.length > 0 ? data.sections.signals.map((signal: any) => (
              <div key={signal.id} className={`p-4 border rounded-lg flex items-start gap-3 shadow-sm ${
                signal.type === 'warning' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
              }`}>
                <span className="text-xl">{signal.type === 'warning' ? '⚠️' : '💡'}</span>
                <div>
                  <p className="font-medium text-gray-900">{signal.message}</p>
                  <p className="text-sm text-gray-600 mt-1 capitalize">Độ ưu tiên: {signal.priority}</p>
                </div>
              </div>
            )) : <p className="text-gray-500 italic">Chưa có dữ liệu tín hiệu.</p>}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Công việc (Tasks)</h2>
          <div className="space-y-3">
            {data.sections.tasks && data.sections.tasks.length > 0 ? data.sections.tasks.map((task: any) => (
              <div key={task.id} className="p-4 border rounded-lg bg-white shadow-sm">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <p className="font-medium text-gray-900">{task.title}</p>
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap capitalize ${
                    task.status === 'done' ? 'bg-green-100 text-green-700' : 
                    task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>{task.status.replace('-', ' ')}</span>
                </div>
                {task.assignee && <p className="text-sm text-gray-500">Phụ trách: {task.assignee}</p>}
              </div>
            )) : <p className="text-gray-500 italic">Chưa có dữ liệu công việc.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
