import * as React from "react";
import { clsx } from "clsx";

import "./progressBar.scss";

export const ProgressBar = ({
  loading,
  show = true,
  ...props
}: {
  loading: boolean;
  show?: boolean;
} & React.HTMLProps<HTMLDivElement>) => {
  return (
    <div
      {...props}
      className={clsx("progress-bar", loading && "loading", props.className)}
    ></div>
  );
};
