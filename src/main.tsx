import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { inicializarTema } from './store/uiStore'
import './styles/index.css'

// Tema antes da primeira pintura: sem flash de tela branca no galpão escuro.
inicializarTema()

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Elemento #root não encontrado no index.html')

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
