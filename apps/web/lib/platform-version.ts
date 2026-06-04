import webPackage from "../package.json";

export const NOF_MP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || webPackage.version;
export const NOF_MP_FOOTER_MARKER = `NOF.MP // v${NOF_MP_VERSION}`;
