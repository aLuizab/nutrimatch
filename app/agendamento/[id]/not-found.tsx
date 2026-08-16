import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PublicHeader from '../../components/PublicHeader'

export default function ProfissionalNaoEncontrado() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="text-gray-400 text-lg font-medium">Profissional não encontrado</p>
        <p className="text-gray-400 text-sm mt-2">Esse perfil não existe ou não está mais disponível para agendamento.</p>
        <Link href="/resultados" className="inline-flex items-center gap-2 mt-6 text-emerald-600 text-sm font-medium hover:underline">
          <ArrowLeft size={16} /> Voltar aos resultados
        </Link>
      </div>
    </div>
  )
}
