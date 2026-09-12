import next from 'eslint-config-next'

// eslint-config-next 16 ships a native flat config, so no FlatCompat shim is needed.
const config = [
  ...next,
  {
    ignores: ['.next/**', 'node_modules/**', 'prisma/migrations/**', 'next-env.d.ts'],
  },
  {
    rules: {
      // React Compiler opinions about memoisation and setState-in-effect. They flag real
      // performance smells, but they are advisory rather than correctness bugs, and the
      // affected spots (URL-driven filter state syncing from props) are a deliberate,
      // working pattern. Kept visible as warnings so they don't silently accumulate, but
      // not blocking CI — a lint gate that fails on style opinions is a gate that gets
      // switched off, and then it stops catching the errors that matter.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/incompatible-library': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
]

export default config
