/** Public links. Set NEXT_PUBLIC_GITHUB_URL / NEXT_PUBLIC_X_URL when the public repo and account exist. */
export const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || "/docs#source";
export const X_URL = process.env.NEXT_PUBLIC_X_URL || "/docs#contact";
export const ATTACK_TESTS_URL = process.env.NEXT_PUBLIC_GITHUB_URL ? `${process.env.NEXT_PUBLIC_GITHUB_URL}/tree/main/contracts/test` : "/docs#attack-library";
