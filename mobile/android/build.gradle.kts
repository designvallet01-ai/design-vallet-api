allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}

subprojects {
    project.evaluationDependsOn(":app")
}

subprojects {
    val configureAction = {
        if (project.hasProperty("android")) {
            val android = project.extensions.getByName("android")
            try {
                val getNamespace = android.javaClass.getMethod("getNamespace")
                val setNamespace = android.javaClass.getMethod("setNamespace", String::class.java)
                if (getNamespace.invoke(android) == null) {
                    val namespace = "id.flutter.plugins.${project.name.replace("-", "_")}"
                    setNamespace.invoke(android, namespace)
                }
            } catch (e: Exception) {
                // Not a supported android extension or namespace already set
            }

            // Task workaround to remove the legacy 'package' attribute from source manifest files of plugins
            project.tasks.configureEach {
                if (name.contains("processDebugManifest") || name.contains("processReleaseManifest")) {
                    doFirst {
                        val manifestFile = project.file("src/main/AndroidManifest.xml")
                        if (manifestFile.exists()) {
                            var content = manifestFile.readText()
                            if (content.contains("package=")) {
                                content = content.replace(Regex("""package="[^"]*""""), "")
                                manifestFile.writeText(content)
                                println("[GRADLE WORKAROUND] Stripped package attribute from ${manifestFile.absolutePath}")
                            }
                        }
                    }
                }
            }
        }
    }
    if (project.state.executed) {
        configureAction()
    } else {
        afterEvaluate {
            configureAction()
        }
    }
}

subprojects {
    project.tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
        kotlinOptions {
            jvmTarget = "17"
        }
    }
    project.tasks.withType<JavaCompile>().configureEach {
        sourceCompatibility = "17"
        targetCompatibility = "17"
    }
}



tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
