import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { useObservadorSessao } from './hooks/useAuth'
import { useObservadorConexao } from './hooks/useConexao'

export function App() {
  // Sessão e conexão são observadas uma vez, acima do router:
  // trocar de tela não pode reiniciar o listener do Auth.
  useObservadorSessao()
  useObservadorConexao()

  return <RouterProvider router={router} />
}
