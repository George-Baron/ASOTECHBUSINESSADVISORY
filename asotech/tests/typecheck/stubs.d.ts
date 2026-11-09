// Permissive ambient stubs so first-party code can be type-checked where npm packages cannot be installed.
// Real builds use the real types; this file is ONLY for tests/typecheck/tsconfig.json.
declare module "react" {
  export type ReactNode = any; export type ReactElement = any; export type CSSProperties = any;
  export type InputHTMLAttributes<T = any> = any; export type SelectHTMLAttributes<T = any> = any;
  export type TextareaHTMLAttributes<T = any> = any; export type ButtonHTMLAttributes<T = any> = any;
  export type FormEvent<T = any> = any; export type ChangeEvent<T = any> = any; export type MouseEvent<T = any> = any;
  export type ComponentProps<T = any> = any; export type PropsWithChildren<T = {}> = T & { children?: any };
  export function useActionState<S, P = any>(action: (state: S, payload: P) => any, initial: S): [S, (payload: P) => void, boolean];
  export const useState: any, useEffect: any, useRef: any, useMemo: any, useCallback: any, useTransition: any,
    useOptimistic: any, useId: any, Suspense: any, Fragment: any, createElement: any;
}
declare module "react/jsx-runtime" { export const jsx: any, jsxs: any, Fragment: any; }
declare module "react-dom/server" { export const renderToStaticMarkup: any, renderToString: any; }
declare module "next" { export type Metadata = any; export type Viewport = any; export type NextConfig = any; }
declare module "next/link" { const Link: any; export default Link; }
declare module "next/image" { const Image: any; export default Image; }
declare module "next/headers" { export const cookies: any, headers: any; }
declare module "next/navigation" { export const redirect: any, notFound: any, useRouter: any, usePathname: any, useSearchParams: any; }
declare module "next/cache" { export const revalidatePath: any, revalidateTag: any; }
declare module "next/server" { export type NextRequest = any; export const NextResponse: any; }
declare module "@supabase/ssr" { export const createServerClient: any, createBrowserClient: any; }
declare module "@supabase/supabase-js" { export const createClient: any; export type SupabaseClient = any; }
declare module "read-excel-file/browser" { const readXlsx: any; export default readXlsx; }
declare module "read-excel-file/node" { const readXlsx: any; export default readXlsx; }
declare module "tailwindcss" { export type Config = any; }
declare module "*.css";
declare namespace JSX { interface IntrinsicElements { [k: string]: any } interface Element {} interface IntrinsicAttributes { key?: any } interface ElementChildrenAttribute { children: {} } }
