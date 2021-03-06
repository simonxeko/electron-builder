import { Arch } from "builder-util"
import * as path from "path"
import { Platform, Target, TargetSpecificOptions } from "../core"
import { PlatformPackager } from "../platformPackager"
import { archive, tar } from "./archive"

export class ArchiveTarget extends Target {
  readonly options: TargetSpecificOptions = (this.packager.config as any)[this.name]

  constructor(name: string, readonly outDir: string, private readonly packager: PlatformPackager<any>, private readonly isWriteUpdateInfo = false) {
    super(name)
  }

  async build(appOutDir: string, arch: Arch): Promise<any> {
    const packager = this.packager
    const isMac = packager.platform === Platform.MAC
    const format = this.name

    let defaultPattern: string
    if (packager.platform === Platform.LINUX) {
      // tslint:disable-next-line:no-invalid-template-strings
      defaultPattern = "${name}-${version}" + (arch === Arch.x64 ? "" : "-${arch}") + ".${ext}"
    }
    else {
      // tslint:disable-next-line:no-invalid-template-strings
      defaultPattern = "${productName}-${version}" + (arch === Arch.x64 ? "" : "-${arch}") + "-${os}.${ext}"
    }

    const artifactName = packager.expandArtifactNamePattern(this.options, format, arch, defaultPattern, false)
    const artifactPath = path.join(this.outDir, artifactName)

    this.logBuilding(`${isMac ? "macOS " : ""}${format}`, artifactPath, arch)
    if (format.startsWith("tar.")) {
      await tar(packager.compression, format, artifactPath, appOutDir, isMac, packager.info.tempDirManager)
    }
    else {
      await archive(format, artifactPath, appOutDir, {
        compression: packager.compression,
        withoutDir: !isMac,
      })
    }

    packager.info.dispatchArtifactCreated({
      file: artifactPath,
      // tslint:disable-next-line:no-invalid-template-strings
      safeArtifactName: packager.computeSafeArtifactName(artifactName, format, arch, false, defaultPattern.replace("${productName}", "${name}")),
      target: this,
      arch,
      packager,
      isWriteUpdateInfo: this.isWriteUpdateInfo,
    })
  }
}