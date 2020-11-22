import * as babel from '@babel/core'
import { NodePath, PluginObj } from '@babel/core'
import { Import, CallExpression, StringLiteral, Program } from '@babel/types'

let counter = 0

export default function transformDynamicImportsToStatic({
  types: t,
}: typeof babel): PluginObj {
  return {
    name: 'transform-dynamic-imports-to-static',
    visitor: {
      Import(path: NodePath<Import>) {
        // 去掉动态字符串
        // import(`${dynamicPath}`)
        if (!t.isStringLiteral((path.parent as CallExpression).arguments[0]))
          return

        // `import(**path**)`
        const importPath = (path.parent as CallExpression)
          .arguments[0] as StringLiteral

        //
        const wrappingPath = path.parentPath.parentPath

        // 特别的 `import("path")` 和 `await import("path")` 需要提到最前面
        const isErasableImport =
          wrappingPath.isExpressionStatement() ||
          (wrappingPath.isAwaitExpression() &&
            wrappingPath.parentPath.isExpressionStatement())

        // 这些 import 可以提到最前面，并删除目前的位置
        if (isErasableImport) {
          // 生成 import "path"
          const staticImport = t.importDeclaration([], importPath)

          // 添加到最前面
          ;(path.findParent((path) => path.isProgram())!
            .node as Program).body.unshift(staticImport)

          // 清理工作
          path.parentPath.parentPath.remove()
          return
        }

        // 独特的引用
        const importIdentifier = `$$${counter}`

        // 生成 import 语法
        const staticImport = t.importDeclaration(
          [t.importNamespaceSpecifier(t.identifier(importIdentifier))],
          importPath
        )
        // 添加到最前面
        ;(path.findParent((path) => path.isProgram())!
          .node as Program).body.unshift(staticImport)
        // 替换 `import("module-name")`
        // 到 `Promise.resolve(_$_0)`
        path.parentPath.replaceWith(
          t.callExpression(
            t.memberExpression(
              t.identifier('Promise'),
              t.identifier('resolve')
            ),
            [t.identifier(importIdentifier)]
          )
        )
        counter++
      },
    },
  }
}
