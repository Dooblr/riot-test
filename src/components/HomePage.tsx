import { useState, useEffect } from 'react';
import { fetchFreeRotation, ChampionData } from '../services/riotApi';
import './HomePage.scss';

export default function HomePage() {
  const [champions, setChampions] = useState<ChampionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFreeRotation = async () => {
      try {
        setLoading(true);
        setError(null);
        const freeChampions = await fetchFreeRotation();
        setChampions(freeChampions);
      } catch (err) {
        setError('Failed to load free champion rotation');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadFreeRotation();
  }, []);

  if (loading) {
    return <div className="loading">Loading free champion rotation...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="home-page">
      <div className="header">
        <h2>Weekly Free Champion Rotation</h2>
        <p>These champions are free to play this week!</p>
      </div>

      <div className="champion-grid">
        {champions.map(champion => (
          <div key={champion.id} className="champion-card">
            <img 
              src={champion.imageUrl} 
              alt={champion.name}
              className="champion-image"
            />
            <div className="champion-info">
              <h3>{champion.name}</h3>
              <p>{champion.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 