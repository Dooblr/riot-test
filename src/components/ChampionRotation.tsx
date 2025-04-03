import { useState, useEffect } from 'react';
import { fetchFreeRotation, ChampionData } from '../services/riotApi';
import './ChampionRotation.scss';

export default function ChampionRotation() {
  const [champions, setChampions] = useState<ChampionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChampions = async () => {
      try {
        setLoading(true);
        const data = await fetchFreeRotation();
        setChampions(data);
        setError(null);
      } catch (err) {
        setError('Failed to load champion rotation');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadChampions();
  }, []);

  if (loading) {
    return <div className="loading">Loading champion rotation...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="champion-rotation">
      <h2>Weekly Free Champion Rotation</h2>
      {champions.length === 0 ? (
        <p>No champions in free rotation found</p>
      ) : (
        <div className="champion-grid">
          {champions.map((champion) => (
            <div key={champion.id} className="champion-card">
              <img 
                src={champion.imageUrl} 
                alt={champion.name} 
                className="champion-image" 
              />
              <h3>{champion.name}</h3>
              <p className="champion-title">{champion.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 