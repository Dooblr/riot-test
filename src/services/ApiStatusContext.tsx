import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_KEY, REGION } from './riotApi';

interface ApiStatusContextType {
  isRotationApiAvailable: boolean;
}

const ApiStatusContext = createContext<ApiStatusContextType>({
  isRotationApiAvailable: false
});

export const useApiStatus = () => useContext(ApiStatusContext);

interface ApiStatusProviderProps {
  children: ReactNode;
}

export const ApiStatusProvider: React.FC<ApiStatusProviderProps> = ({ children }) => {
  const [isRotationApiAvailable, setIsRotationApiAvailable] = useState<boolean>(false);

  const checkApiStatus = async () => {
    try {
      // Set up AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Try to make a request to the rotation endpoint
      const response = await fetch(
        `https://${REGION}.api.riotgames.com/lol/platform/v3/champion-rotations?api_key=${API_KEY}`,
        { 
          method: 'GET',
          signal: controller.signal
        }
      );
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // If the response is ok, set the status to available
      setIsRotationApiAvailable(response.ok);
      
      if (!response.ok) {
        console.warn(`Champion rotation API is not available: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      // If an error occurs, set the status to unavailable
      console.error('Error checking Riot API status:', error);
      setIsRotationApiAvailable(false);
    }
  };

  useEffect(() => {
    // Check API status immediately
    checkApiStatus();
    
    // Set up polling every 10 seconds
    const intervalId = setInterval(checkApiStatus, 10000);
    
    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  return (
    <ApiStatusContext.Provider value={{ isRotationApiAvailable }}>
      {children}
    </ApiStatusContext.Provider>
  );
}; 