export default function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>
      <div className="space-y-6 max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-gray-800 font-semibold mb-4">Credit Rate</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="text-gray-700 text-sm font-medium">
                  Small bottle (≤350ml)
                </p>
                <p className="text-gray-400 text-xs">Earns per deposit</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="w-16 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  defaultValue="1"
                />
                <span className="text-gray-500 text-sm">min</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="text-gray-700 text-sm font-medium">
                  Medium bottle (500ml)
                </p>
                <p className="text-gray-400 text-xs">Earns per deposit</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="w-16 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  defaultValue="1"
                />
                <span className="text-gray-500 text-sm">min</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-gray-700 text-sm font-medium">
                  Large bottle (≥1L)
                </p>
                <p className="text-gray-400 text-xs">Earns per deposit</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="w-16 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  defaultValue="2"
                />
                <span className="text-gray-500 text-sm">min</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-gray-800 font-semibold mb-4">
            Bin Alert Threshold
          </h2>
          <div className="flex items-center gap-4">
            <input
              className="flex-1 accent-green-600"
              defaultValue="80"
              max="95"
              min="50"
              type="range"
            />
            <span className="text-gray-800 font-bold w-12 text-right">80%</span>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            Alert admins when bin fill level exceeds this threshold
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-gray-800 font-semibold mb-4">
            ML Confidence Threshold
          </h2>
          <div className="flex items-center gap-4">
            <input
              className="flex-1 accent-green-600"
              defaultValue="80"
              max="95"
              min="50"
              type="range"
            />
            <span className="text-gray-800 font-bold w-12 text-right">80%</span>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            Detections below this threshold are flagged for ML review
          </p>
        </div>
        <button
          className="px-6 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90"
          style={{ backgroundColor: "#1B5E20" }}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
