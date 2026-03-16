import fs from 'fs';
import path from 'path';
import { finished } from 'stream/promises';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const LIBS_DIR = path.join(ROOT_DIR, 'java-libs');

// All JARs are from Maven Central
const JARS = [
  // JUnit 5 standalone (includes everything needed to run tests)
  { name: 'junit-platform-console-standalone-1.10.2.jar', url: 'https://repo1.maven.org/maven2/org/junit/platform/junit-platform-console-standalone/1.10.2/junit-platform-console-standalone-1.10.2.jar' },
  // Apache Commons Lang3
  { name: 'commons-lang3-3.14.0.jar', url: 'https://repo1.maven.org/maven2/org/apache/commons/commons-lang3/3.14.0/commons-lang3-3.14.0.jar' },
  // Apache Commons IO
  { name: 'commons-io-2.15.1.jar', url: 'https://repo1.maven.org/maven2/commons-io/commons-io/2.15.1/commons-io-2.15.1.jar' },
  // Gson
  { name: 'gson-2.10.1.jar', url: 'https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar' },
  // Commons CSV
  { name: 'commons-csv-1.10.0.jar', url: 'https://repo1.maven.org/maven2/org/apache/commons/commons-csv/1.10.0/commons-csv-1.10.0.jar' },
  // jsoup
  { name: 'jsoup-1.17.2.jar', url: 'https://repo1.maven.org/maven2/org/jsoup/jsoup/1.17.2/jsoup-1.17.2.jar' },
  // SLF4J API
  { name: 'slf4j-api-2.0.12.jar', url: 'https://repo1.maven.org/maven2/org/slf4j/slf4j-api/2.0.12/slf4j-api-2.0.12.jar' },
  // Logback classic (SLF4J impl)
  { name: 'logback-classic-1.5.3.jar', url: 'https://repo1.maven.org/maven2/ch/qos/logback/logback-classic/1.5.3/logback-classic-1.5.3.jar' },
  // Logback core
  { name: 'logback-core-1.5.3.jar', url: 'https://repo1.maven.org/maven2/ch/qos/logback/logback-core/1.5.3/logback-core-1.5.3.jar' },
  // H2 in-memory DB
  { name: 'h2-2.2.224.jar', url: 'https://repo1.maven.org/maven2/com/h2database/h2/2.2.224/h2-2.2.224.jar' },
  // SQLite JDBC
  { name: 'sqlite-jdbc-3.45.1.0.jar', url: 'https://repo1.maven.org/maven2/org/xerial/sqlite-jdbc/3.45.1.0/sqlite-jdbc-3.45.1.0.jar' },
  // HSQLDB
  { name: 'hsqldb-2.7.2.jar', url: 'https://repo1.maven.org/maven2/org/hsqldb/hsqldb/2.7.2/hsqldb-2.7.2.jar' },
  // Mockito core
  { name: 'mockito-core-5.10.0.jar', url: 'https://repo1.maven.org/maven2/org/mockito/mockito-core/5.10.0/mockito-core-5.10.0.jar' },
  // AssertJ
  { name: 'assertj-core-3.25.3.jar', url: 'https://repo1.maven.org/maven2/org/assertj/assertj-core/3.25.3/assertj-core-3.25.3.jar' },
];

async function downloadFile(url, dest) {
  if (fs.existsSync(dest)) {
    console.log(`  ✓ Already exists: ${path.basename(dest)}`);
    return;
  }
  console.log(`  ↓ Downloading ${path.basename(dest)}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.statusText}`);
  const fileStream = fs.createWriteStream(dest);
  await finished(Readable.fromWeb(res.body).pipe(fileStream));
  console.log(`  ✓ Done: ${path.basename(dest)}`);
}

async function main() {
  fs.mkdirSync(LIBS_DIR, { recursive: true });
  console.log(`\n📦 Installing Java libraries into /java-libs/ (${JARS.length} jars)...\n`);

  let failed = 0;
  for (const jar of JARS) {
    try {
      await downloadFile(jar.url, path.join(LIBS_DIR, jar.name));
    } catch (err) {
      console.error(`  ✗ Failed: ${jar.name} — ${err.message}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n⚠️  ${failed} jar(s) failed to download. Re-run setup:java-libs to retry.`);
  } else {
    console.log(`\n✅ All Java libraries installed successfully!`);
  }
}

main();
