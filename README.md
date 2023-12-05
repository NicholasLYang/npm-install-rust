# Rust

Ever wanted to install Rust but only have access to `npm`? Well, now you can!

Just run `npm install rust` to get a full Rust toolchain.

This uses nightly by default, but if you want a stable toolchain, use `npm install rust@stable`.

## Optional Installation

By default, this package will *not* install the toolchain if it already exists. This is to avoid
accidentally overriding the existing toolchain, and to avoid installing an entire toolchain into your
`node_modules` folder unnecessarily.

To override this behavior, you can set the `RUST_INSTALL_MODE` environment variable to `skip`, if you wish 
to always skip the installation, or to `force`, if you wish to always install the toolchain.
