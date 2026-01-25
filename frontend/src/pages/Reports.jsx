import { useState } from 'react';
import api from '../utils/api';

function Reports() {
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [report, setReport] = useState(null);

    const fetchReport = async () => {
        if (!date) {
            setError('Please select a date');
            return;
        }

        setLoading(true);
        setError('');
        setReport(null);

        try {
            const response = await api.get(
                `/reports/daily-summary?date=${date}`
            );

            if (response.data.success) {
                setReport(response.data.data);
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Failed to load report'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">
                Daily Team Summary
            </h2>

            {/* Date Picker */}
            <div className="bg-white p-4 rounded shadow mb-6 flex gap-4 items-end">
                <div>
                    <label className="block text-sm text-gray-600 mb-1">
                        Select Date
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border px-3 py-2 rounded"
                    />
                </div>

                <button
                    onClick={fetchReport}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    {loading ? 'Loading...' : 'Generate Report'}
                </button>
            </div>

            {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Team Summary */}
            {report && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-4 rounded shadow">
                            <p className="text-gray-500 text-sm">
                                Total Check-ins
                            </p>
                            <p className="text-2xl font-bold">
                                {report.team_summary.total_checkins}
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded shadow">
                            <p className="text-gray-500 text-sm">
                                Working Hours
                            </p>
                            <p className="text-2xl font-bold">
                                {report.team_summary.total_working_hours}
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded shadow">
                            <p className="text-gray-500 text-sm">
                                Clients Visited
                            </p>
                            <p className="text-2xl font-bold">
                                {report.team_summary.total_clients_visited}
                            </p>
                        </div>
                    </div>

                    {/* Employee Table */}
                    <div className="bg-white rounded shadow">
                        <h3 className="font-semibold p-4 border-b">
                            Employee Breakdown
                        </h3>

                        {report.employees.length > 0 ? (
                            <table className="w-full">
                                <thead className="bg-gray-50 text-left text-sm">
                                    <tr>
                                        <th className="p-3">Employee</th>
                                        <th className="p-3">Check-ins</th>
                                        <th className="p-3">Hours</th>
                                        <th className="p-3">Clients</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.employees.map(emp => (
                                        <tr
                                            key={emp.employee_id}
                                            className="border-t"
                                        >
                                            <td className="p-3">
                                                {emp.employee_name}
                                            </td>
                                            <td className="p-3">
                                                {emp.total_checkins}
                                            </td>
                                            <td className="p-3">
                                                {emp.working_hours}
                                            </td>
                                            <td className="p-3">
                                                {emp.clients_visited}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="p-4 text-gray-500">
                                No data for selected date
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default Reports;
