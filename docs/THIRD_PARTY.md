# 资料来源与第三方内容

## 本仓库中可复用的内容

本项目原创代码、教学文字、Canvas/SVG 示意和数值生成的波前、PSF、测试靶图像按根目录 MIT 许可证提供。

早期个人阅读版中使用的两张 Canon 眩光对照照片不包含在这个公开仓库和它生成的离线包内。公开版改为原创 SVG 特征示意，清楚标注“非实拍、非定量镜头预测”。

## 引用资料

以下资料用于核对定义、公式与材料参数。仓库保留引用链接，不分发原文全文或厂商照片。机构名称不表示其对本项目背书。

| 来源 | 用途 | 链接 |
| --- | --- | --- |
| SCHOTT | N-BK7、N-F2 的 Sellmeier 参数与折射率 | [Optical Glass Datasheet Collection](https://media.schott.com/api/public/content/820eba3413cc4e788433a3751f8edba9?download=true&v=97b3ea2b) |
| Edmund Optics | 像差、非球面、消色差、成像与衍射原理 | [Knowledge Center](https://www.edmundoptics.com/knowledge-center/) |
| ZEISS / H. H. Nasse | 摄影镜头 MTF 曲线的理解 | [How to Read MTF Curves](https://lenspire.zeiss.com/photo/app/uploads/2022/02/technical-article-how-to-read-mtf-curves-01.pdf) |
| Nikon | 镜头技术词汇、非球面制造 | [NIKKOR Glossary](https://imaging.nikon.com/imaging/lineup/lens/glossary/) |
| Canon | 镜片材料、抗反射、眩光与鬼影技术 | [Materials and Anti-reflection Technology](https://global.canon/en/technology/canon-tech/interview/element/) |

各知识点的具体参考页面保留在教程和实验室中。

## 图像生成依赖

生成脚本调用 NumPy、SciPy、Pillow 与 Matplotlib；这些库不作为网页运行依赖，也没有把其库代码打包进本仓库。开发者安装它们时应遵守各库自己的许可证。

图鉴使用 Matplotlib 的 `inferno` / `coolwarm` 配色，测试靶文字由 Matplotlib 提供的 DejaVu Sans 字体栅格化。仓库分发生成后的图像，不分发字体文件。配色仅用于显示，不改变计算使用的 PSF 或波前数值。

开源许可不改变外部资料、品牌名称或第三方软件原有的权利和许可条件。
