extern crate bindgen;
extern crate cc;

use std::env;
use std::path::PathBuf;

fn main() {
  cc::Build::new()
    .file("./c/sql3parse_table.c")
    .compile("sql3parse");

    // Tell cargo to look for shared libraries in the specified directory
    println!("cargo:rustc-link-search=./c/");
    println!("cargo:rustc-link-lib=sql3parse");

    // Tell cargo to invalidate the built crate whenever the wrapper changes
    println!("cargo:rerun-if-changed=wrapper.h");

    // The bindgen::Builder is the main entry point
    // to bindgen, and lets you build up options for
    // the resulting bindings.
    let bindings = bindgen::Builder::default()
        // The input header we would like to generate
        // bindings for.
        .header("wrapper.h")
        .allowlist_var(r#"(\w*sql3\w*)"#)
        .allowlist_type(r#"(\w*sql3\w*)"#)
        .allowlist_function(r#"(\w*sql3\w*)"#)
        // Tell cargo to invalidate the built crate whenever any of the
        // included header files changed.
        .parse_callbacks(Box::new(bindgen::CargoCallbacks))
        // Finish the builder and generate the bindings.
        .generate()
        // Unwrap the Result and panic on failure.
        .expect("Unable to generate bindings");

    // Write the bindings to the $OUT_DIR/bindings.rs file.
    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Couldn't write bindings!");
}