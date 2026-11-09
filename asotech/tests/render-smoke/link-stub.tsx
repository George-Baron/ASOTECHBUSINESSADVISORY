import React from "react";
export default function Link({ href, children, ...r }: any) { return <a href={href} {...r}>{children}</a>; }
