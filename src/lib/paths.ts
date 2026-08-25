import { collection, doc, type CollectionReference, type DocumentReference } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Multi-tenant desde o dia 1: absolutamente tudo mora dentro de uma oficina.
 * Ninguém monta caminho de Firestore com string solta — passa por aqui,
 * para não existir a possibilidade de ler dado de outra oficina por descuido.
 */

export const ROOT_OFICINAS = 'oficinas'
export const ROOT_USUARIOS_INDEX = 'usuariosIndex'
export const ROOT_APROVACOES = 'aprovacoes'

export const refOficina = (oficinaId: string): DocumentReference =>
  doc(db, ROOT_OFICINAS, oficinaId)

/** Índice raiz consultado no login, antes de saber a oficina do usuário. */
export const refUsuarioIndex = (uid: string): DocumentReference =>
  doc(db, ROOT_USUARIOS_INDEX, uid)

/** Token público de aprovação de orçamento (Fase 4). */
export const refAprovacao = (token: string): DocumentReference =>
  doc(db, ROOT_APROVACOES, token)

const sub = (oficinaId: string, nome: string): CollectionReference =>
  collection(db, ROOT_OFICINAS, oficinaId, nome)

export const colUsuarios = (o: string) => sub(o, 'usuarios')
export const colMecanicos = (o: string) => sub(o, 'mecanicos')
export const colClientes = (o: string) => sub(o, 'clientes')
export const colVeiculos = (o: string) => sub(o, 'veiculos')
export const colOrdens = (o: string) => sub(o, 'ordens')
export const colCatalogoPecas = (o: string) => sub(o, 'catalogoPecas')
export const colCatalogoServicos = (o: string) => sub(o, 'catalogoServicos')
export const colPagamentos = (o: string) => sub(o, 'pagamentos')

export const refUsuario = (o: string, id: string) => doc(colUsuarios(o), id)
export const refMecanico = (o: string, id: string) => doc(colMecanicos(o), id)
export const refCliente = (o: string, id: string) => doc(colClientes(o), id)
export const refVeiculo = (o: string, id: string) => doc(colVeiculos(o), id)
export const refOrdem = (o: string, id: string) => doc(colOrdens(o), id)

/** Timeline da OS. */
export const colHistorico = (o: string, osId: string) =>
  collection(db, ROOT_OFICINAS, o, 'ordens', osId, 'historico')

/** Documento de configuração e contador sequencial da oficina. */
export const refConfigGeral = (o: string) => doc(db, ROOT_OFICINAS, o, 'config', 'geral')

/** Pasta das fotos da OS no Storage. */
export const caminhoFotosOS = (o: string, osId: string) => `oficinas/${o}/ordens/${osId}/fotos`
