from setuptools import setup, find_packages
import os

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in systemair_app/__init__.py
version = '0.0.1'
init_path = os.path.join(os.path.dirname(__file__), "systemair_app", "__init__.py")
if os.path.exists(init_path):
	with open(init_path) as f:
		for line in f:
			if line.startswith("__version__"):
				version = line.split("=")[1].strip().strip("'").strip('"')
				break

setup(
	name="systemair_app",
	version=version,
	description="SystemAir Fan Cost Calculator and Quotation App",
	author="Nest Software",
	author_email="info@nestsoftware.com",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
