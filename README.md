# TinSalver

This is a tiny script to PGP sign Maven artifacts uploaded to Sonatype Nexus.  
It is especially helpful for doing releases to Maven Central.

## Prerequisites

Make sure that you have an account on https://keybase.io and that you imported your PGP key.

Also, you will need to install and configure Keybase's CLI.

To run the script itself, you will need NodeJS installed on your machine.

## Usage

Just [release your artifacts to OSSRH Staging](https://central.sonatype.org/publish/publish-guide/) as usual
(`https://oss.sonatype.org/service/local/staging/deploy/maven2` with your Sonatype username/password),
without any signatures.

Then, sign them with TinSalver:

With npx:
```shell
$ npx github:bsideup/tinsalver sign -u userOrTokenId -p passwordOrToken comexample-java-1234
```

Or locally:
```shell
$ npm install
$ node tinsalver.mjs sign -u userOrTokenId -p passwordOrToken comexample-java-1234
```

WTF is `comexample-java-1234`? This is your staging repo id.

You will find a list of all your "open" staging repositories in Sonatype's ultra modern Web UI:  
https://oss.sonatype.org/#stagingRepositories

## How it works

The script will use Nexus' API to find all artifacts in a given staging repository,
download them and call `keybase pgp sign` to generate signatures.  
Then, it will upload generated signatures to the same staging repo (hence the user/password requirement),
so that it can be closed & released.

## Why does it work?

Staged repositories allow uploading multiple files, meaning that the signatures can be uploaded after the CI run.

This eliminates the need to run signing during the CI, and you can sign the result (with your **private** key)
after CI has finished uploading the artifacts.

## But... does it _really_ work?

Yes! Here is a list of projects that were released with this tool:

- https://github.com/docker-java/docker-java
- https://github.com/bsideup/jabel

You can check it yourself:

```shell
$ curl https://keybase.io/bsideup/pgp_keys.asc | gpg --import
gpg: key 100306F2B3793BF3: public key "keybase.io/bsideup <bsideup@keybase.io>" imported
gpg: Total number processed: 1
gpg:               imported: 1
$ 
$ wget -q https://repo1.maven.org/maven2/com/github/docker-java/docker-java-api/3.2.9/docker-java-api-3.2.9.pom{,.asc}
$ 
$ gpg --verify docker-java-api-3.2.9.pom.asc docker-java-api-3.2.9.pom
gpg: Signature made Do 17 Jun 17:22:15 2021 CEST
gpg:                using RSA key BF7CC7DEFE9389D7
gpg: Good signature from "keybase.io/bsideup <bsideup@keybase.io>" [unknown]
```

## But... Why?

Bintray was an amazing way to release to Maven Central, but it is no longer available.

As I didn't want to put my GPG private key on CI (yes, even as a secret. Yes, I know about the GHA Environments :D),
I started thinking "is it possible to do what Bintray did for us, but... manually?". You're reading the result's README.