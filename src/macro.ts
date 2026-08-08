import type { ASTNode } from './ast.ts'
import { Env } from './env.ts'
import { evalNodes, type LispValue } from './interpreter.ts'

export function macroexpand1(
  node: ASTNode,
  env: Env
): { expanded: boolean; node: ASTNode } {
  if (node.type !== 'list' || node.elements.length === 0) {
    return { expanded: false, node }
  }

  const [first, ...args] = node.elements
  if (first?.type === 'symbol') {
    const macro = env.getMacro(first.name)
    if (macro) {
      // Create execution frame for macro (binding raw AST args without evaluating them)
      const macroEnv = new Env(macro.env)
      macro.params.forEach((param, i) => {
        // Convert ASTNode argument directly into a quoted/literal value for the macro body
        macroEnv.defineVar(param, astToValue(args[i]!))
      })

      // Evaluate macro body to produce the target AST
      const expandedLispValue = evalNodes(macro.body, macroEnv)
      const expandedAST = valueToAST(expandedLispValue)

      return { expanded: true, node: expandedAST }
    }
  }

  return { expanded: false, node }
}

export function macroexpand(node: ASTNode, env: Env): ASTNode {
  let current = node
  let { expanded, node: next } = macroexpand1(current, env)

  // Keep expanding top-level if macro returns another macro call
  while (expanded) {
    current = next
    ;({ expanded, node: next } = macroexpand1(current, env))
  }

  // Recursively expand sub-expressions
  if (current.type === 'list') {
    return {
      type: 'list',
      elements: current.elements.map((child) => macroexpand(child, env)),
    }
  }

  return current
}

/**
 * Converts an AST node (parse tree) into a LispValue datum.
 * Used during macro expansion when passing raw AST structure into a macro function.
 */
export function astToValue(node: ASTNode): LispValue {
  switch (node.type) {
    case 'number':
      return { type: 'number', value: node.value }
    case 'string':
      return { type: 'string', value: node.value }
    case 'boolean':
      return { type: 'boolean', value: node.value }
    case 'symbol':
      return { type: 'symbol', name: node.name }
    case 'list':
      return {
        type: 'list',
        elements: node.elements.map(astToValue),
      }
  }
}

/**
 * Converts a LispValue back into an AST node.
 * Used after macro evaluation to turn the returned LispValue back into AST for execution.
 */
export function valueToAST(val: LispValue): ASTNode {
  switch (val.type) {
    case 'number':
      return { type: 'number', value: val.value }
    case 'string':
      return { type: 'string', value: val.value }
    case 'boolean':
      return { type: 'boolean', value: val.value }
    case 'symbol':
      return { type: 'symbol', name: val.name }
    case 'list':
      return {
        type: 'list',
        elements: val.elements.map(valueToAST),
      }
  }
}
