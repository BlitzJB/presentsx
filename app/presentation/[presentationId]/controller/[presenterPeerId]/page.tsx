import ControllerComponent from '@/components/ControllerComponent'

export default function ControllerPage({ params }: { params: { presentationId: string, presenterPeerId: string } }) {
  return <ControllerComponent presentationId={params.presentationId} presenterPeerId={params.presenterPeerId} />
}
