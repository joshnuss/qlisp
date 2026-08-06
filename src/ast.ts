export interface NumberNode {
  type: 'number'
  value: number
}

export interface StringNode {
  type: 'string'
  value: string
}

export interface SymbolNode {
  type: 'symbol'
  name: string
}

export interface BooleanNode {
  type: 'boolean'
  value: boolean
}

export interface ListNode {
  type: 'list'
  elements: ASTNode[]
}

export type ASTNode =
  NumberNode | StringNode | SymbolNode | BooleanNode | ListNode
