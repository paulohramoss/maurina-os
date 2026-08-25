import { useCallback, useEffect, useState } from 'react'
import { onSnapshot, setDoc } from 'firebase/firestore'
import { refConfigGeral } from '@/lib/paths'
import { semUndefined } from '@/lib/firestoreHelpers'
import { useAuthStore } from '@/store/authStore'
import type { ConfigOficina } from '@/types'

const PADRAO: ConfigOficina = {
  nome: 'Maurina AutoCar',
  contadorOS: 0,
  anoContador: new Date().getFullYear(),
  revisaoPadraoKm: 10000,
  revisaoPadraoMeses: 6,
  garantiaPadraoMeses: 3,
}

/** Dados da oficina: cabeçalho da OS impressa, termos e padrões de revisão. */
export function useConfigOficina() {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [config, setConfig] = useState<ConfigOficina>(PADRAO)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!oficinaId) return

    return onSnapshot(
      refConfigGeral(oficinaId),
      (snap) => {
        setConfig(snap.exists() ? { ...PADRAO, ...(snap.data() as Partial<ConfigOficina>) } : PADRAO)
        setCarregando(false)
      },
      (e) => {
        console.error('[Config] Falha ao carregar:', e)
        setCarregando(false)
      },
    )
  }, [oficinaId])

  /**
   * Salva sem tocar no contador de OS: ele pertence à transação de abertura,
   * e sobrescrevê-lo daqui geraria número duplicado.
   */
  const salvar = useCallback(
    async (dados: Partial<Omit<ConfigOficina, 'contadorOS' | 'anoContador'>>) => {
      if (!oficinaId) throw new Error('Sessão não carregada.')
      await setDoc(refConfigGeral(oficinaId), semUndefined(dados as Record<string, unknown>), {
        merge: true,
      })
    },
    [oficinaId],
  )

  return { config, carregando, salvar }
}

export const TERMOS_PADRAO = `1. A garantia dos serviços executados é de 90 (noventa) dias, contados da data de entrega do veículo, conforme o art. 26 do Código de Defesa do Consumidor.
2. As peças aplicadas têm a garantia oferecida pelo respectivo fabricante.
3. A garantia não cobre defeitos decorrentes de mau uso, acidente, falta de manutenção preventiva ou intervenção de terceiros.
4. Peças substituídas ficam à disposição do cliente por 30 dias; após esse prazo serão descartadas.
5. A oficina não se responsabiliza por objetos deixados no interior do veículo.
6. Veículos não retirados em até 30 dias após a comunicação de conclusão estarão sujeitos a cobrança de estadia.`
