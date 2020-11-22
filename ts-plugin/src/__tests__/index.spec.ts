import pluginTester from 'babel-plugin-tester'
import plugin from './..'
import path from 'path'

pluginTester({
  plugin: plugin,
  babelOptions: {
    plugins: ['@babel/plugin-syntax-top-level-await'],
  },
  tests: [
    {
      title: 'dynamic import',
      code: `import React, { useState, useEffect } from 'react'
export function AsyncLogin() {
  const [Login, setLogin] = useState()
  useEffect(() => {
    import('./login').then(({ LoginComponent }) => {
      setLogin(() => LoginComponent)
    })
  }, [])
}`,
      output: `import * as $$0 from './login'
import React, { useState, useEffect } from 'react'
export function AsyncLogin() {
  const [Login, setLogin] = useState()
  useEffect(() => {
    Promise.resolve($$0).then(({ LoginComponent }) => {
      setLogin(() => LoginComponent)
    })
  }, [])
}`,
    },
  ],
})
