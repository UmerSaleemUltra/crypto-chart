"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Line } from "react-chartjs-2"
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from "chart.js"

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend)

export default function CryptoTracker() {
  const [coins, setCoins] = useState([])
  const [search, setSearch] = useState("")
  const [selectedCoins, setSelectedCoins] = useState([])
  const [chartData, setChartData] = useState({})
  const [alerts, setAlerts] = useState({})
  const [alertMessage, setAlertMessage] = useState("")
  const [portfolio, setPortfolio] = useState(() => {
    const savedPortfolio = localStorage.getItem("cryptoPortfolio")
    return savedPortfolio ? JSON.parse(savedPortfolio) : {}
  })
  const [favorites, setFavorites] = useState(() => {
    const savedFavorites = localStorage.getItem("cryptoFavorites")
    return savedFavorites ? JSON.parse(savedFavorites) : []
  })
  const [activeTab, setActiveTab] = useState("market")
  const [loading, setLoading] = useState(true)
  const [openDropdown, setOpenDropdown] = useState(null)

  const fetchCryptoData = useCallback(async () => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1",
      )
      const data = await response.json()
      setCoins(data)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching data", error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCryptoData()
    const intervalId = setInterval(fetchCryptoData, 60000) // Refresh every minute
    return () => clearInterval(intervalId)
  }, [fetchCryptoData])

  useEffect(() => {
    localStorage.setItem("cryptoPortfolio", JSON.stringify(portfolio))
  }, [portfolio])

  useEffect(() => {
    localStorage.setItem("cryptoFavorites", JSON.stringify(favorites))
  }, [favorites])

  const fetchChartData = async (coinId) => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7&interval=daily`,
      )
      const data = await response.json()
      const prices = data.prices.map((price) => ({
        x: new Date(price[0]).toLocaleDateString(),
        y: price[1],
      }))

      setChartData((prev) => ({
        ...prev,
        [coinId]: {
          labels: prices.map((p) => p.x),
          datasets: [
            {
              label: `${coinId.toUpperCase()} Price`,
              data: prices.map((p) => p.y),
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              tension: 0.4,
            },
          ],
        },
      }))
    } catch (error) {
      console.error("Error fetching chart data", error)
    }
  }

  const toggleFavorite = useCallback((coinId) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(coinId) ? prev.filter((id) => id !== coinId) : [...prev, coinId]
      localStorage.setItem("cryptoFavorites", JSON.stringify(newFavorites))
      return newFavorites
    })
  }, [])

  const addToPortfolio = useCallback((coinId, amount) => {
    setPortfolio((prev) => {
      const newPortfolio = {
        ...prev,
        [coinId]: (prev[coinId] || 0) + Number.parseFloat(amount),
      }
      localStorage.setItem("cryptoPortfolio", JSON.stringify(newPortfolio))
      return newPortfolio
    })
  }, [])

  const setAlert = (coinId, price) => {
    setAlerts((prev) => ({
      ...prev,
      [coinId]: price,
    }))
    setAlertMessage(`Alert set for ${coins.find((c) => c.id === coinId)?.name} at $${price}`)
    setTimeout(() => setAlertMessage(""), 3000)
  }

  const showChart = (coinId) => {
    if (!chartData[coinId]) {
      fetchChartData(coinId)
    }
    setSelectedCoins((prev) => {
      if (prev.includes(coinId)) {
        return prev
      }
      return [...prev, coinId]
    })
    setActiveTab("charts")
  }

  const filteredCoins = useMemo(
    () => coins.filter((coin) => coin.name.toLowerCase().includes(search.toLowerCase())),
    [coins, search],
  )

  const portfolioValue = useMemo(
    () =>
      Object.entries(portfolio).reduce((total, [coinId, amount]) => {
        const coin = coins.find((c) => c.id === coinId)
        return total + (coin ? coin.current_price * amount : 0)
      }, 0),
    [portfolio, coins],
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <h1 className="text-4xl font-bold text-blue-500">Real-Time Crypto Tracker</h1>
          <div className="w-full md:w-auto">
            <input
              type="text"
              placeholder="Search Cryptocurrency..."
              className="w-full md:w-80 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        {alertMessage && (
          <div className="bg-green-500 text-white px-4 py-3 rounded-lg mb-6 animate-fade-in">{alertMessage}</div>
        )}

        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {["market", "portfolio", "favorites", "charts"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab ? "bg-blue-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {activeTab === "market" && (
              <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left">Coin</th>
                      <th className="px-6 py-3 text-left">Price</th>
                      <th className="px-6 py-3 text-left">24h Change</th>
                      <th className="px-6 py-3 text-left">Market Cap</th>
                      <th className="px-6 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredCoins.map((coin) => (
                      <tr key={coin.id} className="bg-gray-900 hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={coin.image || "/placeholder.svg"} alt={coin.name} className="w-8 h-8" />
                            <span className="font-medium">{coin.name}</span>
                            {favorites.includes(coin.id) && (
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-500">
                                Favorite
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">${coin.current_price.toFixed(2)}</td>
                        <td
                          className={`px-6 py-4 ${
                            coin.price_change_percentage_24h > 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {coin.price_change_percentage_24h.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4">${coin.market_cap.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleFavorite(coin.id)}
                              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                            >
                              {favorites.includes(coin.id) ? "★" : "☆"}
                            </button>
                            <button
                              onClick={() => showChart(coin.id)}
                              className="px-3 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors"
                            >
                              Chart
                            </button>
                            <div className="relative">
                              <button
                                onClick={() => setOpenDropdown(openDropdown === coin.id ? null : coin.id)}
                                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                              >
                                •••
                              </button>
                              {openDropdown === coin.id && (
                                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5">
                                  <div
                                    className="py-1"
                                    role="menu"
                                    aria-orientation="vertical"
                                    aria-labelledby="options-menu"
                                  >
                                    <button
                                      onClick={() => {
                                        const amount = prompt("Enter amount to add to portfolio:")
                                        if (amount) addToPortfolio(coin.id, amount)
                                        setOpenDropdown(null)
                                      }}
                                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white w-full text-left"
                                      role="menuitem"
                                    >
                                      Add to Portfolio
                                    </button>
                                    <button
                                      onClick={() => {
                                        const price = prompt("Enter alert price:")
                                        if (price) setAlert(coin.id, price)
                                        setOpenDropdown(null)
                                      }}
                                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white w-full text-left"
                                      role="menuitem"
                                    >
                                      Set Price Alert
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "portfolio" && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">Your Portfolio</h2>
                <p className="text-xl mb-6">Total Value: ${portfolioValue.toFixed(2)}</p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left">Coin</th>
                        <th className="px-6 py-3 text-left">Amount</th>
                        <th className="px-6 py-3 text-left">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {Object.entries(portfolio).map(([coinId, amount]) => {
                        const coin = coins.find((c) => c.id === coinId)
                        if (!coin) return null
                        return (
                          <tr key={coinId}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img src={coin.image || "/placeholder.svg"} alt={coin.name} className="w-6 h-6" />
                                {coin.name}
                              </div>
                            </td>
                            <td className="px-6 py-4">{amount}</td>
                            <td className="px-6 py-4">${(amount * coin.current_price).toFixed(2)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "favorites" && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">Favorite Coins</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left">Coin</th>
                        <th className="px-6 py-3 text-left">Price</th>
                        <th className="px-6 py-3 text-left">24h Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredCoins
                        .filter((coin) => favorites.includes(coin.id))
                        .map((coin) => (
                          <tr key={coin.id}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img src={coin.image || "/placeholder.svg"} alt={coin.name} className="w-6 h-6" />
                                {coin.name}
                              </div>
                            </td>
                            <td className="px-6 py-4">${coin.current_price.toFixed(2)}</td>
                            <td
                              className={`px-6 py-4 ${
                                coin.price_change_percentage_24h > 0 ? "text-green-500" : "text-red-500"
                              }`}
                            >
                              {coin.price_change_percentage_24h.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "charts" && (
              <div className="grid gap-6 md:grid-cols-2">
                {selectedCoins.length > 0 ? (
                  selectedCoins.map((coinId) => (
                    <div key={coinId} className="bg-gray-800 rounded-lg p-6 overflow-hidden">
                      <h3 className="text-xl font-bold mb-4">{coins.find((c) => c.id === coinId)?.name} Price Chart</h3>
                      <div className="h-[300px]">
                        {chartData[coinId] ? (
                          <Line
                            data={chartData[coinId]}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  display: false,
                                },
                              },
                              scales: {
                                x: {
                                  grid: {
                                    color: "rgba(255, 255, 255, 0.1)",
                                  },
                                  ticks: {
                                    color: "rgba(255, 255, 255, 0.7)",
                                  },
                                },
                                y: {
                                  grid: {
                                    color: "rgba(255, 255, 255, 0.1)",
                                  },
                                  ticks: {
                                    color: "rgba(255, 255, 255, 0.7)",
                                  },
                                },
                              },
                            }}
                          />
                        ) : (
                          <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                    Select coins from the market tab to view their charts
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

