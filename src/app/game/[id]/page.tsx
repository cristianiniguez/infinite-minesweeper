import { GameLoader } from '@/components/GameLoader';

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GameLoader id={id} />;
}
