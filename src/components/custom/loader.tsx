import type { FC } from "react";
import { ScaleLoader } from "react-spinners";
interface LoaderProps {}

const Loader: FC<LoaderProps> = () => {
  return (
    <div className="flex flex-col items-center justify-center h-svh w-full gap-4">
      <ScaleLoader
        cssOverride={{}}
        loading
        speedMultiplier={1}
        color="hsl(var(--primary))"
      />
      <p className="text-sm text-muted-foreground">加载中...</p>
    </div>
  );
};

export default Loader;
