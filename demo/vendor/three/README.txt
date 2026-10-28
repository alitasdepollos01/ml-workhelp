three.js r185 (npm three@0.185.1), MIT licence (LICENSE, from the package). Used only by js/pin-hero.js, loaded
with import() when an earned pin is opened or earned in the main window. Vendored because the app's pages allow
scripts from 'self' only (no CDN, no import map).

  three.module.min.js   build/three.module.min.js   sha256 86bcee248b64f44bcfc23c331ae74619061957d59cab040171dcb6fb5900beb6
  three.core.min.js     build/three.core.min.js     sha256 05b2609338c76cd65daf74f3ac515bc9a5045e1b3b33edc07d8c9bd55250fa90
  RoomEnvironment.js    examples/jsm/environments/RoomEnvironment.js (sha256 55f466192cc84298755a424c5e040345006b2ee1455589b3b54126c2ea4123f4)
                        one change: `from 'three'` → `from './three.module.min.js'` (a page without an import map can't load a bare name)

To update: npm pack three@<version>, copy the same three files, make the same one-line change, update these lines.
