/** BGM 控制函数类型 */
export interface BgmControls {
  pauseBgm?: () => void;
  resumeBgm?: () => void;
  restartBgm?: () => void;
}

/** GamePage 组件属性 */
export interface GamePageProps extends BgmControls {}