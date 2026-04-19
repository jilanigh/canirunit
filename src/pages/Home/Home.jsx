import Hero from '../../components/Hero/Hero';
import SpecsBar from '../../components/SpecsBar/SpecsBar';
import GameGrid from '../../components/GameGrid/GameGrid';

export default function Home({ specs, onRescan }) {
  return (
    <>
      <Hero />
      <SpecsBar specs={specs} onRescan={onRescan} />
      <GameGrid specs={specs} />
    </>
  );
}
