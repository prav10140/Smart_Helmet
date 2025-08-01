"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { alertService } from "../services/alertService"

const AlertContext = createContext()

export const useAlert = () => {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider")
  }
  return context
}

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([])
  const [currentStatus, setCurrentStatus] = useState({
    helmet: "connected",
    accident: false,
    fatigue: "normal",
    location: null,
    lastUpdate: null,
  })
  const [isEmergency, setIsEmergency] = useState(false)
  const [emergencyCountdown, setEmergencyCountdown] = useState(0)

  // Poll for updates every 5 seconds
  useEffect(() => {
    const pollAlerts = async () => {
      try {
        const data = await alertService.getLatestAlerts()
        setAlerts(data.alerts || [])
        setCurrentStatus(data.status || currentStatus)

        // Check for emergency conditions
        if (data.status?.accident && !isEmergency) {
          triggerEmergency()
        }
      } catch (error) {
        console.error("Failed to fetch alerts:", error)
      }
    }

    pollAlerts() // Initial fetch
    const interval = setInterval(pollAlerts, 5000)

    return () => clearInterval(interval)
  }, [isEmergency])

  // Emergency countdown timer
  useEffect(() => {
    let timer
    if (emergencyCountdown > 0) {
      timer = setTimeout(() => {
        setEmergencyCountdown(emergencyCountdown - 1)
      }, 1000)
    } else if (emergencyCountdown === 0 && isEmergency) {
      // Auto-trigger SOS after countdown
      handleSOS()
    }

    return () => clearTimeout(timer)
  }, [emergencyCountdown, isEmergency])

  const triggerEmergency = () => {
    setIsEmergency(true)
    setEmergencyCountdown(30) // 30 second countdown
  }

  const cancelEmergency = () => {
    setIsEmergency(false)
    setEmergencyCountdown(0)
  }

  const handleSOS = async () => {
    try {
      await alertService.triggerSOS()
      setIsEmergency(false)
      setEmergencyCountdown(0)

      // Add SOS alert to local state
      const sosAlert = {
        id: Date.now(),
        type: "sos",
        message: "SOS alert triggered",
        timestamp: new Date().toISOString(),
        severity: "critical",
      }
      setAlerts((prev) => [sosAlert, ...prev])
    } catch (error) {
      console.error("Failed to trigger SOS:", error)
    }
  }

  const value = {
    alerts,
    currentStatus,
    isEmergency,
    emergencyCountdown,
    triggerEmergency,
    cancelEmergency,
    handleSOS,
  }

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>
}
