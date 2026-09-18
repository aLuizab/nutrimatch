import { CheckCircle2 } from 'lucide-react'

// Shown once, right after signup, because the redirect alone is not confirmation: landing on a
// dashboard looks the same whether the account was just created or the person simply signed in.
export default function SignupWelcome() {
  return (
    <div className="mx-8 mt-6 flex items-start gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-emerald-800">
      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
      <p className="text-xs font-medium">
        Cadastro concluído. Sua conta foi criada e você já está conectado.
      </p>
    </div>
  )
}
